<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;

class SystemStatusService
{
    /**
     * Get system status and deployment metadata.
     */
    public function getStatus(?string $clientFrontendVersion = null): array
    {
        $environment = config('system.environment', config('app.env', 'production'));
        $backendCommitFull = (string) config('system.git_commit', '82b2d50917d50ce9e5de6b5f6c1ce8a32f1aac89');
        $branch = (string) config('system.git_branch', 'main');
        $deployedAt = config('system.deployed_at', null);

        if (file_exists(base_path('version.json'))) {
            $versionData = json_decode(file_get_contents(base_path('version.json')), true) ?: [];
            if (!empty($versionData['commit'])) {
                $backendCommitFull = (string) $versionData['commit'];
            }
            if (!empty($versionData['branch'])) {
                $branch = (string) $versionData['branch'];
            }
            if (!empty($versionData['deployed_at'])) {
                $deployedAt = $versionData['deployed_at'];
            }
        }

        $backendCommitShort = substr($backendCommitFull, 0, 7);

        // Database Connectivity Check (lightweight PDO check)
        $dbStatus = 'healthy';
        try {
            DB::connection()->getPdo();
        } catch (\Throwable $e) {
            $dbStatus = 'unhealthy';
        }

        // Frontend version: supplied by client request or fallback
        $frontendVersion = $clientFrontendVersion 
            ?: config('system.frontend_version', $backendCommitShort);
        $frontendVersionShort = substr((string) $frontendVersion, 0, 7);

        // Live Server metadata
        $live = [
            'environment' => strtoupper($environment),
            'commit' => $backendCommitShort,
            'commit_full' => $backendCommitFull,
            'branch' => $branch,
            'deployed_at' => $deployedAt,
            'backend' => [
                'status' => 'healthy',
                'version' => $backendCommitShort,
                'api_version' => config('system.api_version', 'v1'),
            ],
            'frontend' => [
                'status' => 'healthy',
                'version' => $frontendVersionShort,
            ],
            'database' => [
                'status' => $dbStatus,
            ],
        ];

        // GitHub Latest Commit Check
        $github = $this->fetchGitHubStatus();

        // AI Studio Status Check
        $aiStudio = $this->fetchAiStudioStatus();

        // Comparison Engine
        $comparison = $this->compareVersions($live, $github, $aiStudio);

        return [
            'environment' => $environment,
            'github' => $github,
            'ai_studio' => $aiStudio,
            'live' => $live,
            'comparison' => $comparison,
            'checked_at' => now()->toIso8601String(),
        ];
    }

    /**
     * Fetch GitHub repository latest status safely.
     */
    protected function fetchGitHubStatus(): array
    {
        $override = config('system.github_commit_override');
        if ($override) {
            $short = substr($override, 0, 7);
            return [
                'repository' => config('system.github_repository', 'tofayelah/POS-Project'),
                'branch' => config('system.github_branch', 'main'),
                'commit' => $short,
                'commit_full' => $override,
                'commit_message' => config('system.github_commit_message', 'Latest GitHub commit'),
                'status' => 'connected',
            ];
        }

        $repo = config('system.github_repository', 'tofayelah/POS-Project');
        $branch = config('system.github_branch', 'main');

        if (!$repo) {
            return [
                'repository' => null,
                'branch' => $branch,
                'commit' => null,
                'status' => 'unavailable',
            ];
        }

        try {
            $cacheKey = "github_commit_" . md5("{$repo}_{$branch}");
            $data = Cache::remember($cacheKey, 300, function () use ($repo, $branch) {
                $apiUrl = config('system.github_api_url', 'https://api.github.com');
                $response = Http::timeout(3)
                    ->withHeaders([
                        'User-Agent' => 'RetailCore-Monitor',
                        'Accept' => 'application/vnd.github.v3+json',
                    ])
                    ->get("{$apiUrl}/repos/{$repo}/commits/{$branch}");

                if ($response->successful()) {
                    $json = $response->json();
                    $sha = $json['sha'] ?? null;
                    $msg = $json['commit']['message'] ?? '';
                    $msgLine = strtok((string) $msg, "\r\n");
                    return [
                        'commit' => $sha ? substr($sha, 0, 7) : null,
                        'commit_full' => $sha,
                        'commit_message' => $msgLine ?: null,
                        'status' => 'connected',
                    ];
                }

                return null;
            });

            if ($data) {
                return array_merge([
                    'repository' => $repo,
                    'branch' => $branch,
                ], $data);
            }
        } catch (\Throwable $e) {
            // Log/ignore network issues safely
        }

        return [
            'repository' => $repo,
            'branch' => $branch,
            'commit' => null,
            'status' => 'unavailable',
        ];
    }

    /**
     * Inspect AI Studio build metadata.
     */
    protected function fetchAiStudioStatus(): array
    {
        $commit = config('system.ai_studio_commit');
        $buildId = config('system.ai_studio_build_id');

        if (!$commit && !$buildId) {
            return [
                'commit' => null,
                'build_id' => null,
                'status' => 'not_reported',
            ];
        }

        $short = $commit ? substr($commit, 0, 7) : null;
        return [
            'commit' => $short,
            'commit_full' => $commit,
            'build_id' => $buildId,
            'status' => 'reported',
        ];
    }

    /**
     * Compare versions across environments.
     */
    protected function compareVersions(array $live, array $github, array $aiStudio): array
    {
        // GitHub vs Live comparison
        $githubVsLive = 'UNKNOWN';
        if ($github['status'] === 'connected' && !empty($github['commit']) && !empty($live['commit'])) {
            $githubVsLive = ($github['commit'] === $live['commit']) ? 'UP_TO_DATE' : 'OUTDATED';
        }

        // Backend vs Frontend comparison
        $backendVsFrontend = 'NOT_REPORTED';
        $backendVer = $live['backend']['version'] ?? null;
        $frontendVer = $live['frontend']['version'] ?? null;
        if ($backendVer && $frontendVer) {
            $backendVsFrontend = ($backendVer === $frontendVer) ? 'SYNCHRONIZED' : 'VERSION_MISMATCH';
        }

        // GitHub vs AI Studio comparison
        $githubVsAiStudio = 'NOT_REPORTED';
        if ($aiStudio['status'] === 'reported' && !empty($aiStudio['commit'])) {
            if ($github['status'] === 'connected' && !empty($github['commit'])) {
                $githubVsAiStudio = ($github['commit'] === $aiStudio['commit']) ? 'UP_TO_DATE' : 'VERSION_MISMATCH';
            } else {
                $githubVsAiStudio = 'UNKNOWN';
            }
        }

        return [
            'github_vs_live' => $githubVsLive,
            'backend_vs_frontend' => $backendVsFrontend,
            'github_vs_ai_studio' => $githubVsAiStudio,
        ];
    }
}
