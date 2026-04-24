<?php

namespace App\Support\Audit;

use App\Models\AuditLog;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AuditLogger
{
    public function record(
        Request $request,
        string $action,
        ?Model $subject = null,
        array $before = [],
        array $after = [],
        array $meta = [],
    ): void {
        AuditLog::query()->create([
            'user_id' => $request->user()?->id,
            'action' => $action,
            'subject_type' => $subject ? $subject::class : null,
            'subject_id' => $subject?->getKey(),
            'before' => $before === [] ? null : $before,
            'after' => $after === [] ? null : $after,
            'meta' => $meta === [] ? null : $meta,
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ]);
    }
}
