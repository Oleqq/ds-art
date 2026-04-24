const ruDateFormatter = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
});

const ruDateTimeFormatter = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
});

export const scheduleDayLabels = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

function parseDateOnly(value: string) {
    const [year, month, day] = value.split('-').map(Number);

    return new Date(year, (month ?? 1) - 1, day ?? 1);
}

export function formatJoinedOn(value: string | null) {
    if (!value) {
        return '—';
    }

    return ruDateFormatter.format(parseDateOnly(value));
}

export function formatUploadedAt(value: string | null) {
    if (!value) {
        return 'Без даты';
    }

    return ruDateTimeFormatter.format(new Date(value));
}

export function formatTenure(value: string | null) {
    if (!value) {
        return '—';
    }

    const startedAt = parseDateOnly(value);
    const now = new Date();

    let years = now.getFullYear() - startedAt.getFullYear();
    let months = now.getMonth() - startedAt.getMonth();

    if (now.getDate() < startedAt.getDate()) {
        months -= 1;
    }

    if (months < 0) {
        years -= 1;
        months += 12;
    }

    if (years <= 0) {
        return `${Math.max(months, 0)} мес.`;
    }

    if (months === 0) {
        return `${years} г.`;
    }

    return `${years} г. ${months} мес.`;
}

export function getInitials(name: string) {
    return name
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join('');
}

export function getStatusLabel(status: 'active' | 'inactive') {
    return status === 'active' ? 'Активен' : 'Неактивен';
}
