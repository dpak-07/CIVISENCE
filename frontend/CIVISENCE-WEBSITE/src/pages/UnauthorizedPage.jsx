import { AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import PageTransition from "../components/common/PageTransition";

function UnauthorizedPage() {
  return (
    <PageTransition className="flex min-h-screen items-center justify-center bg-slate-950 p-6 text-white">
      <div className="w-full max-w-lg rounded-3xl border border-rose-300/20 bg-white/5 p-8 text-center backdrop-blur-xl">
        <AlertTriangle className="mx-auto h-10 w-10 text-rose-300" />
        <h1 className="mt-4 text-2xl font-semibold">Unauthorized Access</h1>
        <p className="mt-2 text-sm text-slate-300">You do not have permission for this route.</p>
        <Link
          to="/login"
          className="mt-5 inline-flex rounded-lg border border-white/20 bg-white/10 px-4 py-2 text-sm transition hover:bg-white/20"
        >
          Return to Login
        </Link>
      </div>
    </PageTransition>
  );
}

export default UnauthorizedPage;
