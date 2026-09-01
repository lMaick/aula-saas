import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type WhatsAppButtonProps = {
  href: string | null;
  label: string;
  invalidStudentHref: string;
  className?: string;
  size?: "default" | "sm" | "lg";
};

export function WhatsAppButton({
  href,
  label,
  invalidStudentHref,
  className,
  size = "default",
}: WhatsAppButtonProps) {
  if (!href) {
    return (
      <Link
        className={cn(buttonVariants({ variant: "outline", size }), className)}
        href={invalidStudentHref}
      >
        Atualizar WhatsApp inválido
      </Link>
    );
  }

  return (
    <a
      className={cn(buttonVariants({ variant: "outline", size }), className)}
      href={href}
      rel="noopener noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}
