import { Download, FileCode2, FileText, Globe, X } from 'lucide-react';
import type { KnowledgeBaseArticleExportFormat } from '@/features/knowledge-base/article-export';

const EXPORT_OPTIONS: Array<{
    format: KnowledgeBaseArticleExportFormat;
    title: string;
    description: string;
    icon: typeof FileText;
}> = [
    {
        format: 'doc',
        title: 'Word (.doc)',
        description:
            'Открывается в Word и Google Docs, сохраняет структуру, ссылки и изображения.',
        icon: Download,
    },
    {
        format: 'html',
        title: 'HTML',
        description:
            'Подходит для публикации, миграции на сайт или передачи в другие редакторы.',
        icon: Globe,
    },
    {
        format: 'md',
        title: 'Markdown',
        description:
            'Легкий перенос в CMS, Git и AI-инструменты с чистой структурой статьи.',
        icon: FileCode2,
    },
    {
        format: 'txt',
        title: 'TXT',
        description:
            'Простой текстовый экспорт без сложного форматирования, для быстрого архива.',
        icon: FileText,
    },
];

export function KnowledgeBaseArticleExportModal({
    open,
    onCancel,
    onExport,
}: {
    open: boolean;
    onCancel: () => void;
    onExport: (format: KnowledgeBaseArticleExportFormat) => void;
}) {
    if (!open) {
        return null;
    }

    return (
        <div className="modal-shell" role="dialog" aria-modal="true">
            <button
                type="button"
                aria-label="Закрыть окно экспорта"
                className="modal-shell__backdrop"
                onClick={onCancel}
            />

            <div className="modal-shell__card kb-export-modal">
                <div className="modal-shell__head">
                    <div>
                        <div className="modal-shell__title">Экспорт статьи</div>
                        <p className="modal-shell__description">
                            Выберите формат. Экспортируется текущее состояние
                            статьи, включая несохраненные правки, ссылки,
                            изображения и структуру блоков.
                        </p>
                    </div>

                    <button
                        type="button"
                        className="modal-shell__close"
                        onClick={onCancel}
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <div className="kb-export-modal__grid">
                    {EXPORT_OPTIONS.map((option) => {
                        const Icon = option.icon;

                        return (
                            <button
                                key={option.format}
                                type="button"
                                className="kb-export-modal__item"
                                onClick={() => onExport(option.format)}
                            >
                                <span className="kb-export-modal__icon">
                                    <Icon className="size-5" />
                                </span>
                                <span className="kb-export-modal__content">
                                    <strong>{option.title}</strong>
                                    <small>{option.description}</small>
                                </span>
                            </button>
                        );
                    })}
                </div>

                <div className="modal-shell__footer">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="modal-shell__cancel"
                    >
                        Закрыть
                    </button>
                </div>
            </div>
        </div>
    );
}
