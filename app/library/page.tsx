import { LibraryPage } from "@/components/library-page";
import { LibraryNavigation } from "@/components/library-navigation";

export default function LibraryRoute() {
  return (
    <main className="library-shell">
      <LibraryNavigation />
      <LibraryPage />
    </main>
  );
}
