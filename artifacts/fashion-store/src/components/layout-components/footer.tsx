import { Link } from "wouter";
import { useTranslation } from "react-i18next";

export function Footer() {
  const { t } = useTranslation();

  return (
    <footer className="border-t bg-muted/20 py-10">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <p className="text-2xl font-bold text-primary">
              {t("common.appName")}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {t("common.appSubtitle")}
            </p>
          </div>
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link
              href="/pricing"
              className="hover:text-primary transition-colors"
            >
              {t("common.pricing")}
            </Link>
            <Link
              href="/register"
              className="hover:text-primary transition-colors"
            >
              {t("common.buttons.register")}
            </Link>
            <Link
              href="/login"
              className="hover:text-primary transition-colors"
            >
              {t("common.buttons.login")}
            </Link>
          </div>
        </div>
        <div className="border-t border-border/40 mt-6 pt-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} {t("common.appName")} —{" "}
          {t("common.allRightsReserved")}
        </div>
      </div>
    </footer>
  );
}
