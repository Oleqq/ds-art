<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\KnowledgeBase\KnowledgeBaseSearch;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class KnowledgeBaseSearchController extends Controller
{
    public function __invoke(Request $request, KnowledgeBaseSearch $search): Response
    {
        /** @var User $user */
        $user = $request->user();
        $query = trim((string) $request->query('q', ''));

        return Inertia::render(
            $user->isAdmin() ? 'admin/knowledge-base/search' : 'employee/knowledge-base/search',
            [
                'query' => $query,
                'results' => $search->search($user, $query),
            ],
        );
    }
}
