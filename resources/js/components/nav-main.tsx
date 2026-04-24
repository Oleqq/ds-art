import { Link } from '@inertiajs/react';
import { PlannedFeatureTooltip } from '@/components/planned-feature-tooltip';
import {
    SidebarGroup,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    useSidebar,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { NavItem } from '@/types';

export function NavMain({ items = [] }: { items: NavItem[] }) {
    const { isCurrentOrParentUrl, isCurrentUrl } = useCurrentUrl();
    const { isMobile, setOpenMobile } = useSidebar();

    return (
        <SidebarGroup className="px-0 py-0">
            <SidebarMenu className="gap-1">
                {items.map((item) => (
                    <SidebarMenuItem key={item.title}>
                        {item.disabled ? (
                            item.plannedFeature ? (
                                <PlannedFeatureTooltip feature={item.plannedFeature}>
                                    <SidebarMenuButton
                                        disabled
                                        className="cursor-default opacity-55 hover:bg-transparent hover:text-sidebar-foreground"
                                        tooltip={{ children: item.title }}
                                    >
                                        {item.icon && <item.icon />}
                                        <span>{item.title}</span>
                                    </SidebarMenuButton>
                                </PlannedFeatureTooltip>
                            ) : (
                                <SidebarMenuButton
                                    disabled
                                    className="cursor-default opacity-55 hover:bg-transparent hover:text-sidebar-foreground"
                                    tooltip={{ children: item.title }}
                                >
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </SidebarMenuButton>
                            )
                        ) : (
                            <SidebarMenuButton
                                asChild
                                isActive={item.matchPrefix ? isCurrentOrParentUrl(item.href) : isCurrentUrl(item.href)}
                                tooltip={{ children: item.title }}
                            >
                                <Link
                                    href={item.href}
                                    prefetch
                                    onClick={() => {
                                        if (isMobile) {
                                            setOpenMobile(false);
                                        }
                                    }}
                                >
                                    {item.icon && <item.icon />}
                                    <span>{item.title}</span>
                                </Link>
                            </SidebarMenuButton>
                        )}
                    </SidebarMenuItem>
                ))}
            </SidebarMenu>
        </SidebarGroup>
    );
}
