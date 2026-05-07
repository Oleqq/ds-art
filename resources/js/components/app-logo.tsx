export default function AppLogo() {
    return (
        <div className="app-logo">
            <span className="app-logo__mark" aria-hidden="true">
                <img
                    src="/dsart-logo.webp"
                    alt=""
                    className="app-logo__image"
                    draggable={false}
                />
            </span>
            <span className="app-logo__text">
                <span className="app-logo__name">DS Art</span>
                <span className="app-logo__caption">База сотрудников</span>
            </span>
        </div>
    );
}
