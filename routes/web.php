<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'Dashboard')->name('dashboard');
});

/** PROTOTYPE — throwaway, issue #2. Lives only on the prototype/claim-screen branch. */
Route::inertia('prototype/claim', 'prototype/ClaimScreen')->name('prototype.claim');

require __DIR__.'/settings.php';
