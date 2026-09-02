<?php

use Illuminate\Support\Facades\Route;

Route::inertia('/', 'Welcome')->name('home');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::inertia('dashboard', 'Dashboard')->name('dashboard');
});

/** PROTOTYPE — throwaway, issue #16. Lives only on the prototype/expense-entry branch. */
Route::inertia('prototype/expense-entry', 'prototype/ExpenseEntryScreen')->name('prototype.expense-entry');

require __DIR__.'/settings.php';
