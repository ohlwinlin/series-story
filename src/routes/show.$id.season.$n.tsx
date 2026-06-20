import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/show/$id/season/$n")({
  component: () => <Outlet />,
});