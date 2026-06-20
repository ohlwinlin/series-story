import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/show/$id")({
  component: () => <Outlet />,
});