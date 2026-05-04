import PropTypes from "prop-types";

const Textarea = ({ className = "", ...props }) => {
  return (
    <textarea
      className={`w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 ${className}`.trim()}
      {...props}
    />
  );
};

Textarea.propTypes = {
  className: PropTypes.string,
};

export default Textarea;
