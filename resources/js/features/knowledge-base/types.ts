export type KnowledgeBaseSidebarNode = {
    id: number;
    parent_id: number | null;
    name: string;
    slug: string;
    icon: string;
    icon_image_url: string | null;
    cover_url: string | null;
    is_visible_to_employees: boolean;
    can_delete: boolean;
    href: string;
    children: KnowledgeBaseSidebarNode[];
};

export type KnowledgeBaseSidebarData = {
    home_href: string;
    nodes: KnowledgeBaseSidebarNode[];
};

export type KnowledgeBaseHomeCategory = {
    id: number;
    parent_id: number | null;
    name: string;
    slug: string;
    icon: string;
    icon_image_url: string | null;
    cover_url: string | null;
    is_visible_to_employees: boolean;
    can_delete: boolean;
    href: string;
    subcategories_count: number;
    articles_count: number;
    preview_subcategories: Array<{
        id: number;
        name: string;
        icon: string;
        icon_image_url: string | null;
    }>;
};

export type KnowledgeBaseCategoryCard = {
    id: number;
    parent_id: number | null;
    name: string;
    slug: string;
    icon: string;
    icon_image_url: string | null;
    cover_url: string | null;
    is_visible_to_employees: boolean;
    can_delete: boolean;
    href: string;
    materials_count: number;
};

export type KnowledgeBaseArticleCard = {
    id: number;
    title: string;
    slug: string;
    icon: string;
    icon_image_url: string | null;
    summary: string | null;
    href: string;
    is_published: boolean;
    scheduled_publish_at: string | null;
    tags: string[];
    can_update: boolean;
    can_delete: boolean;
    can_duplicate: boolean;
};

export type KnowledgeBaseCategoryFormPayload = {
    name: string;
    icon: string;
    icon_image_url: string;
    icon_upload: File | null;
    clear_icon_image: boolean;
    cover_url: string;
    cover: File | null;
    clear_cover: boolean;
    parent_id: number | null;
    is_visible_to_employees: boolean;
    return_to: string;
};

export type KnowledgeBaseCategoryRecord = {
    id: number;
    parent_id: number | null;
    name: string;
    slug: string;
    icon: string | null;
    icon_image_url: string | null;
    cover_url: string | null;
    is_visible_to_employees: boolean;
    materials_count: number;
    subcategories: KnowledgeBaseCategoryCard[];
    articles: KnowledgeBaseArticleCard[];
};

export type KnowledgeBaseArticleRecord = {
    id: number;
    title: string;
    slug: string;
    icon: string;
    icon_image_url: string | null;
    summary: string | null;
    content: string | null;
    blocks: KnowledgeBaseArticleBlock[];
    cover_url: string | null;
    is_published: boolean;
    scheduled_publish_at: string | null;
    tags: string[];
    access_level: string;
    updated_at: string | null;
    href: string;
    category: {
        id: number;
        name: string;
        slug: string;
        href: string;
    };
};

export type KnowledgeBaseArticleMoveCategory = {
    id: number;
    name: string;
    slug: string;
    href: string;
    is_current: boolean;
    icon?: string | null;
    icon_image_url?: string | null;
    group_id?: number;
    group_name?: string;
    group_icon?: string | null;
    group_icon_image_url?: string | null;
    depth?: number;
};

export type KnowledgeBaseArticleBlock =
    | {
          id: string;
          type: 'p' | 'h2' | 'h3' | 'quote';
          content: string;
          html?: string;
      }
    | {
          id: string;
          type: 'ul' | 'ol';
          items: string[];
      }
    | {
          id: string;
          type: 'code';
          language: string;
          code: string;
      }
    | {
          id: string;
          type: 'image' | 'video';
          url: string;
          caption: string;
      }
    | {
          id: string;
          type: 'file';
          url: string;
          name: string;
          size_label: string;
          caption: string;
      }
    | {
          id: string;
          type: 'table';
          rows: string[][];
      }
    | {
          id: string;
          type: 'link';
          url: string;
          title: string;
          caption: string;
      };

export type KnowledgeBaseArticleFormPayload = {
    knowledge_category_id: number;
    title: string;
    icon: string;
    icon_image_url: string;
    icon_upload: File | null;
    clear_icon_image: boolean;
    summary: string;
    content: string;
    blocks: string;
    cover: File | null;
    cover_url: string;
    clear_cover: boolean;
    is_published: boolean;
    scheduled_publish_at: string | null;
    tags: string[];
    access_level: string;
    return_to: string;
};

export type KnowledgeBaseBreadcrumb = {
    id: number;
    name: string;
    icon: string;
    icon_image_url: string | null;
    href: string;
};

export type KnowledgeBaseSearchItem = {
    id: number;
    type: 'category' | 'article';
    title: string;
    icon: string | null;
    icon_image_url?: string | null;
    href: string;
    meta: string;
    excerpt: string;
    is_published?: boolean;
    scheduled_publish_at?: string | null;
};

export type KnowledgeBaseSearchResults = {
    categories: KnowledgeBaseSearchItem[];
    articles: KnowledgeBaseSearchItem[];
    total: number;
};
