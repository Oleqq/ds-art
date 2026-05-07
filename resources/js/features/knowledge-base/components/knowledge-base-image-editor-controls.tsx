import type { ReactNode } from 'react';

type KnowledgeBaseImageEditorControlsProps = {
    title: string;
    note: string;
    horizontal: number;
    vertical: number;
    zoom: number;
    height: number;
    onHorizontalChange: (value: number) => void;
    onVerticalChange: (value: number) => void;
    onZoomChange: (value: number) => void;
    onHeightChange: (value: number) => void;
    onReset: () => void;
    resetLabel?: string;
    actions?: ReactNode;
    beforeSliders?: ReactNode;
    afterSliders?: ReactNode;
};

export function KnowledgeBaseImageEditorControls({
    title,
    note,
    horizontal,
    vertical,
    zoom,
    height,
    onHorizontalChange,
    onVerticalChange,
    onZoomChange,
    onHeightChange,
    onReset,
    resetLabel = 'Сбросить кадр',
    actions,
    beforeSliders,
    afterSliders,
}: KnowledgeBaseImageEditorControlsProps) {
    return (
        <div className="kb-article__cover-controls">
            <div className="kb-article__cover-controls-head">
                <div>
                    <div className="kb-article__cover-controls-title">
                        {title}
                    </div>
                    <div className="kb-article__cover-controls-note">
                        {note}
                    </div>
                </div>

                <button
                    type="button"
                    onClick={onReset}
                    className="kb-article__cover-reset"
                >
                    {resetLabel}
                </button>
            </div>

            {beforeSliders}

            <div className="kb-article__cover-sliders">
                <label className="kb-article__cover-slider">
                    <span>Горизонталь</span>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={horizontal}
                        onChange={(event) =>
                            onHorizontalChange(Number(event.target.value))
                        }
                    />
                </label>

                <label className="kb-article__cover-slider">
                    <span>Вертикаль</span>
                    <input
                        type="range"
                        min={0}
                        max={100}
                        step={1}
                        value={vertical}
                        onChange={(event) =>
                            onVerticalChange(Number(event.target.value))
                        }
                    />
                </label>

                <label className="kb-article__cover-slider">
                    <span>Масштаб</span>
                    <input
                        type="range"
                        min={100}
                        max={200}
                        step={5}
                        value={zoom}
                        onChange={(event) =>
                            onZoomChange(Number(event.target.value))
                        }
                    />
                </label>

                <label className="kb-article__cover-slider">
                    <span>Высота</span>
                    <input
                        type="range"
                        min={160}
                        max={520}
                        step={10}
                        value={height}
                        onChange={(event) =>
                            onHeightChange(Number(event.target.value))
                        }
                    />
                </label>
            </div>

            {afterSliders}

            {actions ? (
                <div className="kb-article__cover-actions">{actions}</div>
            ) : null}
        </div>
    );
}
