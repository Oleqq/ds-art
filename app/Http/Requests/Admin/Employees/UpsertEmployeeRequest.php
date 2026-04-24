<?php

namespace App\Http\Requests\Admin\Employees;

use App\Models\Employee;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class UpsertEmployeeRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        $this->merge([
            'name' => trim((string) $this->input('name')),
            'email' => trim((string) $this->input('email')),
            'phone' => trim((string) $this->input('phone')),
            'position' => trim((string) $this->input('position')),
            'manager_notes' => trim((string) $this->input('manager_notes')),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $employee = $this->route('employee');

        return [
            'name' => ['required', 'string', 'max:120'],
            'email' => [
                'required',
                'string',
                'email',
                'max:120',
                Rule::unique('employees', 'email')->ignore($employee),
            ],
            'phone' => ['nullable', 'string', 'max:40'],
            'position' => ['required', 'string', 'max:120'],
            'joined_on' => ['required', 'date'],
            'status' => ['required', Rule::in([Employee::STATUS_ACTIVE, Employee::STATUS_INACTIVE])],
            'manager_notes' => ['nullable', 'string', 'max:5000'],
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

                if ($this->input('position', '') === '') {
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

    /**
     * @return array<string, mixed>
     */
    public function employeeData(): array
    {
        $validated = $this->validated();

        return [
            'name' => $validated['name'],
            'email' => $validated['email'],
            'phone' => $validated['phone'] ?: null,
            'position' => $validated['position'],
            'joined_on' => $validated['joined_on'],
            'status' => $validated['status'],
            'manager_notes' => $validated['manager_notes'] ?: null,
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
