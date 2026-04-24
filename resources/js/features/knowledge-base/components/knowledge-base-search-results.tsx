import { Link, router } from '@inertiajs/react';
import { FileText, FolderOpen, Search } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { KnowledgeBaseIcon } from '@/features/knowledge-base/components/knowledge-base-icon';
import type { KnowledgeBaseSearchItem, KnowledgeBaseSearchResults } from '@/features/knowledge-base/types';

function SearchItemCard({ item }: { item: KnowledgeBaseSearchItem }) {
    const isCategory = item.type === 'category';

    return (
        <Link href={item.href} className="kb-search-result">
            <div className="kb-search-result__icon">
                {item.icon || item.icon_image_url ? (
                    <KnowledgeBaseIcon
                        icon={item.icon ?? ''}
                        imageUrl={item.icon_image_url ?? null}
                        className="kb-search-result__emoji"
                        imageClassName="kb-search-result__image"
                    />
                ) : isCategory ? (
                    <FolderOpen className="size-4" />
                ) : (
                    <FileText className="size-4" />
                )}
            </div>

            <div className="kb-search-result__body">
                <div className="kb-search-result__topline">
                    <span className="kb-search-result__type">{isCategory ? 'Раздел' : 'Статья'}</span>
                    <span className="kb-search-result__meta">{item.meta}</span>
                    {item.scheduled_publish_at ? (
                        <span className="kb-search-result__draft">Запланировано</span>
                    ) : item.is_published === false ? (
                        <span className="kb-search-result__draft">Черновик</span>
                    ) : null}
                </div>
                <div className="kb-search-result__title">{item.title}</div>
                {item.excerpt ? <div className="kb-search-result__excerpt">{item.excerpt}</div> : null}
            </div>
        </Link>
    );
}

export function KnowledgeBaseSearchResultsView({
    query,
    results,
    mode,
}: {
    query: string;
    results: KnowledgeBaseSearchResults;
    mode: 'admin' | 'employee';
}) {
    const [value, setValue] = useState(query);
    const searchHref = mode === 'admin' ? '/admin/knowledge-base/search' : '/employee/knowledge-base/search';

    const submit = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();

        const nextQuery = value.trim();

        if (nextQuery === '') {
            router.visit(mode === 'admin' ? '/admin/knowledge-base' : '/employee/knowledge-base');
            return;
        }

        router.get(searchHref, { q: nextQuery }, { preserveState: true });
    };

    return (
        <div className="page-layout kb-search-page flex flex-1 flex-col">
            <div className="page-layout__header kb-search-page__header">
                <div>
                    <h1 className="page-layout__title">Поиск по базе знаний</h1>
                    <p className="page-layout__subtitle">
                        Ищем по разделам, статьям, нормализованным блокам статьи и вложенным файлам.
                    </p>
                </div>
            </div>

            <form className="kb-search-box" onSubmit={submit}>
                <Search className="kb-search-box__icon size-4" />
                <input
                    type="search"
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    placeholder="Введите название статьи, раздела, файл или фразу из текста..."
                    className="kb-search-box__input"
                    autoFocus
                />
                <button type="submit" className="kb-atb-btn kb-atb-btn--primary">
                    Найти
                </button>
            </form>

            <div className="kb-search-page__summary">
                {query ? (
                    <>
                        По запросу <span>«{query}»</span> найдено: {results.total}
                    </>
                ) : (
                    'Введите запрос, чтобы найти материалы в базе знаний.'
                )}
            </div>

            {results.total > 0 ? (
                <div className="kb-search-results">
                    {results.categories.length > 0 ? (
                        <section className="kb-search-section">
                            <h2 className="kb-search-section__title">Разделы</h2>
                            <div className="kb-search-section__list">
                                {results.categories.map((item) => (
                                    <SearchItemCard key={`category-${item.id}`} item={item} />
                                ))}
                            </div>
                        </section>
                    ) : null}

                    {results.articles.length > 0 ? (
                        <section className="kb-search-section">
                            <h2 className="kb-search-section__title">Статьи и материалы</h2>
                            <div className="kb-search-section__list">
                                {results.articles.map((item) => (
                                    <SearchItemCard key={`article-${item.id}`} item={item} />
                                ))}
                            </div>
                        </section>
                    ) : null}
                </div>
            ) : query ? (
                <div className="kb-search-empty">
                    <div className="kb-search-empty__title">Ничего не нашли</div>
                    <div className="kb-search-empty__text">
                        Попробуйте другое слово или проверьте, что материал опубликован и доступен вашей роли.
                    </div>
                </div>
            ) : null}
        </div>
    );
}
