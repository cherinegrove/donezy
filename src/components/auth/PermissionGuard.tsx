import type { ReactNode } from "react";
import { useRbac } from "@/hooks/useRbac";
import type { RbacResource, RbacAction, RbacScope } from "@/types/rbac";

interface PermissionGuardProps {
  resource: RbacResource | "*";
  action: RbacAction | "*";
  scope?: RbacScope;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Conditionally renders children if the current user has the required permission.
 *
 * @example
 * <PermissionGuard resource="projects" action="create">
 *   <Button>Create Project</Button>
 * </PermissionGuard>
 */
export function PermissionGuard({
  resource,
  action,
  scope,
  fallback = null,
  children,
}: PermissionGuardProps) {
  const { can } = useRbac();

  if (!can(resource, action, scope)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
