<?php

namespace App\Support\KnowledgeBase;

use App\Models\KnowledgeArticle;
use App\Models\KnowledgeArticleAsset;
use App\Models\KnowledgeCategory;
use App\Support\PublicStorageAsset;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class KnowledgeBaseCascadeDelete
{
    public function deleteCategoryTree(KnowledgeCategory $category): void
    {
        $category->loadMissing([
            'children.children',
            'articles.assets',
        ]);

        DB::transaction(function () use ($category): void {
            $this->deleteCategoryNode($category);
        });
    }

    public function deleteArticle(KnowledgeArticle $article): void
    {
        $article->loadMissing('assets');

        DB::transaction(function () use ($article): void {
            $this->deleteArticleAssets($article);
            PublicStorageAsset::delete($article->icon_image_url);
            PublicStorageAsset::delete($article->cover_url);
            $article->delete();
        });
    }

    private function deleteCategoryNode(KnowledgeCategory $category): void
    {
        $category->loadMissing([
            'children.children',
            'articles.assets',
        ]);

        foreach ($category->children as $child) {
            $this->deleteCategoryNode($child);
        }

        foreach ($category->articles as $article) {
            $this->deleteArticleAssets($article);
        }

        PublicStorageAsset::delete($category->cover_url);
        PublicStorageAsset::delete($category->icon_image_url);
        $category->delete();
    }

    private function deleteArticleAssets(KnowledgeArticle $article): void
    {
        foreach ($article->assets as $asset) {
            $this->deleteAssetFile($asset);
        }

        PublicStorageAsset::delete($article->icon_image_url);
        PublicStorageAsset::delete($article->cover_url);
    }

    private function deleteAssetFile(KnowledgeArticleAsset $asset): void
    {
        if ($asset->storage_path) {
            Storage::disk('public')->delete($asset->storage_path);

            return;
        }

        PublicStorageAsset::delete($asset->url);
    }
}
