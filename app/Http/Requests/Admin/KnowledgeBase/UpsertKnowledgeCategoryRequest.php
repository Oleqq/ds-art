<?php

namespace App\Http\Requests\Admin\KnowledgeBase;

use App\Models\KnowledgeCategory;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpsertKnowledgeCategoryRequest extends FormRequest
{
    public function authorize(): bool
    {
        /** @var KnowledgeCategory|null $category */
        $category = $this->route('category');

        return $category
            ? $this->user()->can('update', $category)
            : $this->user()->can('create', KnowledgeCategory::class);
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
            'icon' => trim((string) $this->input('icon')),
            'return_to' => trim((string) $this->input('return_to')),
            'clear_icon_image' => $this->boolean('clear_icon_image'),
            'clear_cover' => $this->boolean('clear_cover'),
            'is_visible_to_employees' => $this->boolean('is_visible_to_employees', true),
        ]);
    }

    public function rules(): array
    {
        /** @var KnowledgeCategory|null $category */
        $category = $this->route('category');

        return [
            'name' => ['required', 'string', 'max:120'],
            'icon' => ['nullable', 'string', 'max:32'],
            'icon_upload' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,gif,svg', 'max:2048'],
            'cover' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,gif,svg', 'max:5120'],
            'parent_id' => [
                'nullable',
                'integer',
                Rule::exists('knowledge_categories', 'id'),
                Rule::notIn([$category?->id]),
            ],
            'is_visible_to_employees' => ['required', 'boolean'],
            'clear_icon_image' => ['nullable', 'boolean'],
            'clear_cover' => ['nullable', 'boolean'],
            'return_to' => ['nullable', 'string', 'max:2048'],
        ];
    }

    public function categoryData(): array
    {
        return [
            'parent_id' => $this->integer('parent_id') ?: null,
            'name' => $this->string('name')->toString(),
            'icon' => $this->filled('icon') ? $this->string('icon')->toString() : null,
            'is_visible_to_employees' => $this->boolean('is_visible_to_employees'),
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
}
