<?php

return [
    'environment' => env('RETAILCORE_ENVIRONMENT', env('APP_ENV', 'production')),
    'git_commit' => env('RETAILCORE_GIT_COMMIT', env('GIT_COMMIT', '82b2d50917d50ce9e5de6b5f6c1ce8a32f1aac89')),
    'git_branch' => env('RETAILCORE_GIT_BRANCH', env('GIT_BRANCH', 'main')),
    'build_id' => env('RETAILCORE_BUILD_ID', env('BUILD_ID', '82b2d50')),
    'deployed_at' => env('RETAILCORE_DEPLOYED_AT', '2026-09-27T13:15:01+06:00'),
    'frontend_version' => env('RETAILCORE_FRONTEND_VERSION', null),
    'api_version' => 'v1',

    'github_repository' => env('GITHUB_REPOSITORY', 'tofayelah/POS-Project'),
    'github_branch' => env('GITHUB_BRANCH', 'main'),
    'github_api_url' => env('GITHUB_API_URL', 'https://api.github.com'),
    'github_commit_override' => env('GITHUB_COMMIT_OVERRIDE', null),
    'github_commit_message' => env('GITHUB_COMMIT_MESSAGE', null),

    'ai_studio_commit' => env('AI_STUDIO_GIT_COMMIT', null),
    'ai_studio_build_id' => env('AI_STUDIO_BUILD_ID', null),
];
