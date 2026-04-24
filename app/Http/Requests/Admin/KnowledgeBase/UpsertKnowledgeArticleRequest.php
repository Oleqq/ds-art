<?php

namespace App\Http\Requests\Admin\KnowledgeBase;

use App\Models\KnowledgeArticle;
use App\Support\KnowledgeBase\KnowledgeArticleBlocks;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertKnowledgeArticleRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var KnowledgeArticle|null $article */
        $article = $this->route('article');

        if ($article) {
            return $this->user()?->can('update', $article) ?? false;
        }

        return $this->user()?->can('create', KnowledgeArticle::class) ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'title' => trim((string) $this->input('title')),
            'icon' => trim((string) $this->input('icon')),
            'summary' => trim((string) $this->input('summary')),
            'content' => trim((string) $this->input('content')),
            'blocks' => (string) $this->input('blocks', ''),
            'return_to' => trim((string) $this->input('return_to')),
            'clear_icon_image' => $this->boolean('clear_icon_image'),
            'clear_cover' => $this->boolean('clear_cover'),
            'is_published' => $this->boolean('is_published', true),
            'scheduled_publish_at' => trim((string) $this->input('scheduled_publish_at')),
            'tags' => $this->normalizeTags($this->input('tags', [])),
            'access_level' => trim((string) $this->input('access_level', KnowledgeArticle::ACCESS_INHERIT)),
        ]);
    }

    public function rules(): array
    {
        /** @var KnowledgeArticle|null $article */
        $article = $this->route('article');

        return [
            'knowledge_category_id' => [
                'required',
                'integer',
                Rule::exists('knowledge_categories', 'id'),
            ],
            'title' => ['required', 'string', 'max:180'],
            'icon' => ['nullable', 'string', 'max:32'],
            'icon_upload' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,gif,svg', 'max:2048'],
            'summary' => ['nullable', 'string', 'max:255'],
            'content' => ['nullable', 'string'],
            'blocks' => ['nullable', 'string'],
            'cover' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,gif,svg', 'max:5120'],
            'clear_icon_image' => ['nullable', 'boolean'],
            'clear_cover' => ['nullable', 'boolean'],
            'is_published' => ['required', 'boolean'],
            'scheduled_publish_at' => ['nullable', 'date'],
            'tags' => ['nullable', 'array', 'max:6'],
            'tags.*' => ['string', 'max:24'],
            'access_level' => ['required', 'string', Rule::in(KnowledgeArticle::ACCESS_LEVELS)],
            'return_to' => ['nullable', 'string', 'max:2048'],
        ];
    }

    public function articleData(): array
    {
        $blocks = KnowledgeArticleBlocks::decode(
            $this->input('blocks'),
            $this->input('content'),
        );

        return [
            'knowledge_category_id' => $this->integer('knowledge_category_id'),
            'title' => $this->string('title')->toString(),
            'icon' => $this->filled('icon') ? $this->string('icon')->toString() : null,
            'summary' => $this->filled('summary') ? $this->string('summary')->toString() : null,
            'content' => KnowledgeArticleBlocks::plainText($blocks),
            'blocks' => $blocks,
            'is_published' => $this->boolean('is_published'),
            'scheduled_publish_at' => $this->filled('scheduled_publish_at')
                ? $this->string('scheduled_publish_at')->toString()
                : null,
            'tags' => $this->normalizeTags($this->input('tags', [])),
            'access_level' => $this->string('access_level')->toString(),
        ];
    }

    public function returnTo(): ?string
    {
        $returnTo = $this->string('return_to')->toString();

        if ($returnTo === '' || ! str_starts_with($returnTo, '/')) {
            return null;
        }

        return $returnTo;
    }

    private function normalizeTags(mixed $tags): array
    {
        return collect(is_array($tags) ? $tags : [])
            ->map(fn ($tag) => trim((string) $tag))
            ->filter()
            ->unique()
            ->take(6)
            ->values()
            ->all();
    }
}
