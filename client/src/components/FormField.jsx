export default function FormField({ label, type = 'text', value, onChange, placeholder, required = true, minLength }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium text-slate-700 mb-1">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm
                   focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500
                   transition"
      />
    </label>
  );
}
