import PropTypes from "prop-types";

const baseClasses =
  "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition shadow-sm active:translate-y-px focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:pointer-events-none";

const variantClasses = {
  primary: "bg-slate-900 text-white hover:bg-slate-800 focus:ring-slate-900",
  secondary: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-400 focus:ring-slate-400",
  ghost: "text-slate-700 hover:bg-slate-100 focus:ring-slate-200",
  success: "bg-emerald-500 text-white hover:bg-emerald-600 focus:ring-emerald-500",
  warning: "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500",
  danger: "bg-rose-500 text-white hover:bg-rose-600 focus:ring-rose-500",
};

const Button = ({
  variant = "primary",
  type = "button",
  className = "",
  children,
  ...props
}) => {
  const variantClass = variantClasses[variant] || variantClasses.primary;
  return (
    <button
      type={type}
      className={`${baseClasses} ${variantClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  );
};

Button.propTypes = {
  variant: PropTypes.oneOf([
    "primary",
    "secondary",
    "ghost",
    "success",
    "warning",
    "danger",
  ]),
  type: PropTypes.string,
  className: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default Button;
