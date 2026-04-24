<?php

use App\Http\Controllers\Admin\AccessController as AdminAccessController;
use App\Http\Controllers\Admin\EmployeeController as AdminEmployeeController;
use App\Http\Controllers\Admin\EmployeeFileController as AdminEmployeeFileController;
use App\Http\Controllers\Admin\EmployeePhotoController as AdminEmployeePhotoController;
use App\Http\Controllers\Admin\KnowledgeBaseArticleController as AdminKnowledgeBaseArticleController;
use App\Http\Controllers\Admin\KnowledgeBaseController as AdminKnowledgeBaseController;
use App\Http\Controllers\Employee\KnowledgeBaseArticleController as EmployeeKnowledgeBaseArticleController;
use App\Http\Controllers\Employee\KnowledgeBaseController as EmployeeKnowledgeBaseController;
use App\Http\Controllers\Employee\ProfileController as EmployeeProfileController;
use App\Http\Controllers\KnowledgeBaseSearchController;
use App\Http\Controllers\KnowledgeBaseSearchPreviewController;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/', function (Request $request) {
    if ($request->user()) {
        return redirect()->route('dashboard');
    }

    return redirect()->route('login');
})->name('home');

Route::middleware(['auth', 'active'])->group(function () {
    Route::get('dashboard', function (Request $request) {
        /** @var User $user */
        $user = $request->user();

        return $user->isAdmin()
            ? redirect()->route('admin.dashboard')
            : redirect()->route('employee.dashboard');
    })->name('dashboard');

    Route::middleware('role:admin')->group(function () {
        Route::get('admin', [AdminEmployeeController::class, 'index'])->name('admin.dashboard');
        Route::get('admin/employees', [AdminEmployeeController::class, 'index'])->name('admin.employees.index');
        Route::get('admin/employees/create', [AdminEmployeeController::class, 'create'])->name('admin.employees.create');
        Route::post('admin/employees', [AdminEmployeeController::class, 'store'])->name('admin.employees.store');
        Route::get('admin/employees/{employee}', [AdminEmployeeController::class, 'show'])->name('admin.employees.show');
        Route::get('admin/employees/{employee}/edit', [AdminEmployeeController::class, 'edit'])->name('admin.employees.edit');
        Route::put('admin/employees/{employee}', [AdminEmployeeController::class, 'update'])->name('admin.employees.update');
        Route::patch('admin/employees/{employee}/status', [AdminEmployeeController::class, 'toggleStatus'])->name('admin.employees.status');
        Route::post('admin/employees/{employee}/photo', [AdminEmployeePhotoController::class, 'update'])->name('admin.employees.photo.update');
        Route::post('admin/employees/{employee}/files', [AdminEmployeeFileController::class, 'store'])->name('admin.employees.files.store');
        Route::delete('admin/employees/{employee}/files/{file}', [AdminEmployeeFileController::class, 'destroy'])->name('admin.employees.files.destroy');
        Route::get('admin/employees/{employee}/files/{file}/download', [AdminEmployeeFileController::class, 'download'])->name('admin.employees.files.download');
        Route::get('admin/access', [AdminAccessController::class, 'index'])->name('admin.access.index');
        Route::patch('admin/access/users/{user}', [AdminAccessController::class, 'updateUser'])->name('admin.access.users.update');
        Route::patch('admin/access/categories/{category}', [AdminAccessController::class, 'updateCategory'])->name('admin.access.categories.update');
        Route::patch('admin/access/articles/{article}', [AdminAccessController::class, 'updateArticle'])->name('admin.access.articles.update');
        Route::get('admin/knowledge-base', [AdminKnowledgeBaseController::class, 'index'])->name('admin.knowledge-base.index');
        Route::patch('admin/knowledge-base/reorder', [AdminKnowledgeBaseController::class, 'reorderRoot'])->name('admin.knowledge-base.reorder');
        Route::get('admin/knowledge-base/search', KnowledgeBaseSearchController::class)->name('admin.knowledge-base.search');
        Route::get('admin/knowledge-base/search/preview', KnowledgeBaseSearchPreviewController::class)->name('admin.knowledge-base.search.preview');
        Route::post('admin/knowledge-base/categories', [AdminKnowledgeBaseController::class, 'store'])->name('admin.knowledge-base.categories.store');
        Route::patch('admin/knowledge-base/categories/{category}/move', [AdminKnowledgeBaseController::class, 'move'])->name('admin.knowledge-base.categories.move');
        Route::patch('admin/knowledge-base/categories/{category}/reorder', [AdminKnowledgeBaseController::class, 'reorder'])->name('admin.knowledge-base.categories.reorder');
        Route::get('admin/knowledge-base/categories/{category}', [AdminKnowledgeBaseController::class, 'show'])->name('admin.knowledge-base.categories.show');
        Route::put('admin/knowledge-base/categories/{category}', [AdminKnowledgeBaseController::class, 'update'])->name('admin.knowledge-base.categories.update');
        Route::delete('admin/knowledge-base/categories/{category}', [AdminKnowledgeBaseController::class, 'destroy'])->name('admin.knowledge-base.categories.destroy');
        Route::post('admin/knowledge-base/categories/{category}/articles', [AdminKnowledgeBaseArticleController::class, 'store'])->name('admin.knowledge-base.articles.store');
        Route::get('admin/knowledge-base/articles/{article}', [AdminKnowledgeBaseArticleController::class, 'show'])->name('admin.knowledge-base.articles.show');
        Route::put('admin/knowledge-base/articles/{article}', [AdminKnowledgeBaseArticleController::class, 'update'])->name('admin.knowledge-base.articles.update');
        Route::patch('admin/knowledge-base/articles/{article}/card', [AdminKnowledgeBaseArticleController::class, 'updateCard'])->name('admin.knowledge-base.articles.card.update');
        Route::post('admin/knowledge-base/articles/{article}/duplicate', [AdminKnowledgeBaseArticleController::class, 'duplicate'])->name('admin.knowledge-base.articles.duplicate');
        Route::patch('admin/knowledge-base/articles/{article}/move', [AdminKnowledgeBaseArticleController::class, 'move'])->name('admin.knowledge-base.articles.move');
        Route::post('admin/knowledge-base/articles/{article}/assets', [AdminKnowledgeBaseArticleController::class, 'uploadAsset'])->name('admin.knowledge-base.articles.assets.store');
        Route::delete('admin/knowledge-base/articles/{article}', [AdminKnowledgeBaseArticleController::class, 'destroy'])->name('admin.knowledge-base.articles.destroy');
    });

    Route::middleware('role:employee')->group(function () {
        Route::get('employee', [EmployeeProfileController::class, 'show'])->name('employee.dashboard');
        Route::get('employee/profile', [EmployeeProfileController::class, 'show'])->name('employee.profile.show');
        Route::get('employee/knowledge-base', [EmployeeKnowledgeBaseController::class, 'index'])->name('employee.knowledge-base.index');
        Route::get('employee/knowledge-base/search', KnowledgeBaseSearchController::class)->name('employee.knowledge-base.search');
        Route::get('employee/knowledge-base/search/preview', KnowledgeBaseSearchPreviewController::class)->name('employee.knowledge-base.search.preview');
        Route::get('employee/knowledge-base/categories/{category}', [EmployeeKnowledgeBaseController::class, 'show'])->name('employee.knowledge-base.categories.show');
        Route::post('employee/knowledge-base/categories/{category}/articles', [EmployeeKnowledgeBaseArticleController::class, 'store'])->name('employee.knowledge-base.articles.store');
        Route::get('employee/knowledge-base/articles/{article}', [EmployeeKnowledgeBaseArticleController::class, 'show'])->name('employee.knowledge-base.articles.show');
        Route::put('employee/knowledge-base/articles/{article}', [EmployeeKnowledgeBaseArticleController::class, 'update'])->name('employee.knowledge-base.articles.update');
        Route::post('employee/knowledge-base/articles/{article}/assets', [EmployeeKnowledgeBaseArticleController::class, 'uploadAsset'])->name('employee.knowledge-base.articles.assets.store');
        Route::delete('employee/knowledge-base/articles/{article}', [EmployeeKnowledgeBaseArticleController::class, 'destroy'])->name('employee.knowledge-base.articles.destroy');
    });
});

require __DIR__.'/settings.php';
