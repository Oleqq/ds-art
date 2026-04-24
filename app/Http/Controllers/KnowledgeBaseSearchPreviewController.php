<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Support\KnowledgeBase\KnowledgeBaseSearch;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KnowledgeBaseSearchPreviewController extends Controller
{
    public function __invoke(Request $request, KnowledgeBaseSearch $search): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $query = trim((string) $request->query('q', ''));

        return response()->json([
            'query' => $query,
            'results' => $search->search($user, $query, 4),
        ]);
    }
}
