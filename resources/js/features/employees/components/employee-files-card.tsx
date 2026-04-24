import { useForm } from '@inertiajs/react';
import { FileText, LoaderCircle } from 'lucide-react';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { EmployeeFile } from '@/features/employees/types';
import { formatUploadedAt } from '@/features/employees/utils';

export function EmployeeFilesCard({
    employeeId,
    files,
    readonly = true,
}: {
    employeeId: number;
    files: EmployeeFile[];
    readonly?: boolean;
}) {
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const [pendingName, setPendingName] = useState('');
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const uploadForm = useForm<{
        title: string;
        file: File | null;
    }>({
        title: '',
        file: null,
    });

    const handleSelectFile = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;

        uploadForm.setData('file', file);
        uploadForm.setData(
            'title',
            file ? file.name.replace(/\.[^/.]+$/, '') : '',
        );
        setPendingName(file?.name ?? '');
    };

    const resetPendingFile = () => {
        uploadForm.reset();
        setPendingName('');

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const submitUpload = () => {
        uploadForm.post(`/admin/employees/${employeeId}/files`, {
            preserveScroll: true,
            forceFormData: true,
            onSuccess: () => {
                resetPendingFile();
            },
        });
    };

    const deleteFile = (fileId: number) => {
        setDeletingId(fileId);
        uploadForm.delete(`/admin/employees/${employeeId}/files/${fileId}`, {
            preserveScroll: true,
            onFinish: () => setDeletingId(null),
        });
    };

    return (
        <Card className="surface-card gap-0 border shadow-none">
            <CardHeader className="pb-0">
                <CardTitle className="section-card__title">
                    Файлы ({files.length})
                </CardTitle>
            </CardHeader>
            <CardContent>
                {files.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                        Файлы пока не прикреплены.
                    </p>
                ) : (
                    <div className="file-grid">
                        {files.map((file) => (
                            <div key={file.id} className="file-card">
                                <div className="flex items-start gap-3">
                                    <div className="file-card__icon">
                                        <FileText className="size-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="file-card__title truncate font-medium">
                                            {file.title}
                                        </div>
                                        <div className="file-card__name mt-1 truncate text-sm text-muted-foreground">
                                            {file.original_name}
                                        </div>
                                        <div className="file-card__meta mt-2 text-xs text-muted-foreground">
                                            {file.extension.toUpperCase()} · {file.size_label} ·{' '}
                                            {formatUploadedAt(file.uploaded_at)}
                                        </div>
                                    </div>
                                </div>

                                <div className="file-card__actions">
                                    {file.download_url ? (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            asChild
                                            className="file-card__button"
                                        >
                                            <a href={file.download_url}>↓ Скачать</a>
                                        </Button>
                                    ) : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            disabled
                                            className="file-card__button disabled:cursor-default disabled:opacity-100"
                                        >
                                            ↓ Скачать
                                        </Button>
                                    )}

                                    {readonly ? null : (
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => deleteFile(file.id)}
                                            disabled={
                                                uploadForm.processing &&
                                                deletingId === file.id
                                            }
                                            className="file-card__button file-card__button--danger"
                                        >
                                            {uploadForm.processing && deletingId === file.id ? (
                                                <>
                                                    <LoaderCircle className="size-3.5 animate-spin" />
                                                    Удаляем...
                                                </>
                                            ) : (
                                                'Удалить'
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {readonly ? null : (
                    <div className="file-upload mt-4 text-sm text-muted-foreground">
                        <input
                            ref={fileInputRef}
                            type="file"
                            className="hidden"
                            onChange={handleSelectFile}
                        />

                        <button
                            type="button"
                            className="file-upload__trigger"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            + Прикрепить файл
                        </button>
                        <span>PDF, DOC, JPG, MP4 и другие форматы</span>

                        {uploadForm.data.file ? (
                            <div className="file-upload__form">
                                <div className="form-field">
                                    <label htmlFor="employee-file-title">Заголовок</label>
                                    <input
                                        id="employee-file-title"
                                        type="text"
                                        value={uploadForm.data.title}
                                        onChange={(event) =>
                                            uploadForm.setData('title', event.target.value)
                                        }
                                    />
                                    <div className="file-upload__pending-name">
                                        {pendingName}
                                    </div>

                                    {uploadForm.errors.file ? (
                                        <p className="form-field__error">
                                            {uploadForm.errors.file}
                                        </p>
                                    ) : null}

                                    {uploadForm.errors.title ? (
                                        <p className="form-field__error">
                                            {uploadForm.errors.title}
                                        </p>
                                    ) : null}
                                </div>

                                <div className="file-card__actions">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={submitUpload}
                                        disabled={
                                            uploadForm.processing ||
                                            !uploadForm.data.file ||
                                            !uploadForm.data.title.trim()
                                        }
                                        className="file-card__button"
                                    >
                                        {uploadForm.processing ? (
                                            <>
                                                <LoaderCircle className="size-3.5 animate-spin" />
                                                Сохраняем...
                                            </>
                                        ) : (
                                            'Сохранить'
                                        )}
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={resetPendingFile}
                                        disabled={uploadForm.processing}
                                        className="file-card__button"
                                    >
                                        Отмена
                                    </Button>
                                </div>
                            </div>
                        ) : null}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
