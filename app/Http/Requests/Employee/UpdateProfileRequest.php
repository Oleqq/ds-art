<?php

namespace App\Http\Requests\Employee;

use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpdateProfileRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->isEmployee() ?? false;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
            'email' => trim((string) $this->input('email')),
            'phone' => trim((string) $this->input('phone')),
            'position' => trim((string) $this->input('position')),
        ]);
    }

    public function rules(): array
    {
        /** @var Employee|null $employee */
        $employee = $this->user()?->employee;
        $user = $this->user();

        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required',
                'string',
                'email',
                'max:120',
                Rule::unique('employees', 'email')->ignore($employee),
                Rule::unique('users', 'email')->ignore($user?->id),
            ],
            'phone' => ['nullable', 'string', 'max:40'],
            'position' => ['required', 'string', 'max:120'],
            'joined_on' => ['required', 'date'],
            'schedule.days' => ['required', 'array'],
            'schedule.days.*' => ['integer', 'distinct', 'min:0', 'max:6'],
            'schedule.start' => ['required', 'date_format:H:i'],
            'schedule.end' => ['required', 'date_format:H:i'],
        ];
    }

    public function after(): array
    {
        return [
            function (Validator $validator): void {
                $start = (string) $this->input('schedule.start', '');
                $end = (string) $this->input('schedule.end', '');
                $position = (string) $this->input('position', '');

                if ($position === '') {
                    $validator->errors()->add('position', 'Укажите роль сотрудника.');
                }

                if ($start !== '' && $end !== '' && strcmp($end, $start) <= 0) {
                    $validator->errors()->add(
                        'schedule.end',
                        'Конец рабочего дня должен быть позже начала.',
                    );
                }
            },
        ];
    }

    public function employeeData(): array
    {
        $validated = $this->validated();

        return [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?: null,
            'position' => $validated['position'],
            'joined_on' => $validated['joined_on'],
            'schedule' => [
                'days' => collect($validated['schedule']['days'] ?? [])
                    ->map(fn ($day) => (int) $day)
                    ->sort()
                    ->values()
                    ->all(),
                'start' => $validated['schedule']['start'],
                'end' => $validated['schedule']['end'],
            ],
        ];
    }
}
