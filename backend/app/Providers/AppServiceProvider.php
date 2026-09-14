<?php

namespace App\Providers;

use App\Models\User;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Str;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Super Admin universal Gate bypass
        Gate::before(function ($user, $ability) {
            if ($user instanceof User && $user->hasRole('Super Admin')) {
                return true;
            }
        });

        // Dedicated login rate limiter (5 attempts per minute per normalized email & IP)
        RateLimiter::for('login', function (Request $request) {
            $email = (string) $request->input('email', '');
            $normalizedEmail = Str::transliterate(Str::lower(trim($email)));
            $key = $normalizedEmail.'|'.$request->ip();

            return Limit::perMinute(5)->by($key)->response(function (Request $request, array $headers) {
                return response()->json([
                    'success' => false,
                    'message' => 'Too many login attempts. Please try again in 60 seconds.',
                ], 429, $headers);
            });
        });
    }
}
