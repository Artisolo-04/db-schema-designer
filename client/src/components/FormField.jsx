export default function FormField({ label, type = 'text', value, onChange, placeholder, required = true, minLength }) {
  return (
    <label className="block mb-4">
      <span className="block text-sm font-medium text-slate-300 mb-1.5">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="input-field"
      />
    </label>
  );
}
