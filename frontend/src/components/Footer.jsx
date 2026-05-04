const Footer = () => {
    return (
      <footer className="border-t border-slate-200 bg-[#f5f3ee]">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-slate-600">
              &copy; {new Date().getFullYear()} CarPool System. All rights reserved.
            </p>

            <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm font-semibold text-slate-700">
              <a className="hover:text-slate-900" href="#">Privacy</a>
              <a className="hover:text-slate-900" href="#">Terms</a>
              <a className="hover:text-slate-900" href="#">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    );
  };
  
  export default Footer;