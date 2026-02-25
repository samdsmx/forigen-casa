"use client";

import { 
  InputHTMLAttributes, 
  SelectHTMLAttributes, 
  TextareaHTMLAttributes,
  ReactNode,
  forwardRef
} from "react";

export interface Option {
  value: string;
  label: string;
  disabled?: boolean;
}

// Field Component
interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  help?: string;
  icon?: ReactNode;
  required?: boolean;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(({
  label,
  error,
  help,
  icon,
  required,
  className = "",
  ...props
}, ref) => {
  return (
    <div className="form-group">
      <label className={`form-label ${required ? 'required' : ''}`}>
        {label}
      </label>
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <div className="text-gray-400 dark:text-gray-500">
              {icon}
            </div>
          </div>
        )}
        <input
          ref={ref}
          className={`form-input ${icon ? 'has-icon' : ''} ${error ? 'error' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <div className="form-error">{error}</div>}
      {help && !error && <div className="form-help">{help}</div>}
    </div>
  );
});

Field.displayName = "Field";

// Select Component
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options?: Option[];
  error?: string;
  help?: string;
  placeholder?: string;
  required?: boolean;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  options = [],
  error,
  help,
  placeholder = "Seleccione una opción...",
  required,
  className = "",
  ...props
}, ref) => {
  return (
    <div className="form-group">
      {label ? (
        <label className={`form-label ${required ? 'required' : ''}`}>
          {label}
        </label>
      ) : null}
      <select
        ref={ref}
        className={`form-select ${error ? 'error' : ''} ${className}`}
        style={{ backgroundRepeat: "no-repeat", ...(props.style || {}) }}
        {...props}
      >
        {!(options.length > 0 && options[0]?.value === "") && (
          <option value="">{placeholder}</option>
        )}
        {options
          .filter((option): option is Option => !!option && typeof option.value === "string")
          .map((option, idx) => (
            <option 
              key={option.value || idx} 
              value={option.value}
              disabled={option.disabled}
            >
              {option.label}
            </option>
        ))}
      </select>
      {error && <div className="form-error">{error}</div>}
      {help && !error && <div className="form-help">{help}</div>}
    </div>
  );
});

Select.displayName = "Select";

// Textarea Component
interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  help?: string;
  required?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(({
  label,
  error,
  help,
  required,
  className = "",
  ...props
}, ref) => {
  return (
    <div className="form-group">
      <label className={`form-label ${required ? 'required' : ''}`}>
        {label}
      </label>
      <textarea
        ref={ref}
        className={`form-textarea ${error ? 'error' : ''} ${className}`}
        {...props}
      />
      {error && <div className="form-error">{error}</div>}
      {help && !error && <div className="form-help">{help}</div>}
    </div>
  );
});

Textarea.displayName = "Textarea";

// Checkbox Component
interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  description?: string;
  error?: string;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  description,
  error,
  className = "",
  ...props
}, ref) => {
  return (
    <div className="form-group">
      <div className="flex items-start">
        <input
          ref={ref}
          type="checkbox"
          className={`form-checkbox mt-1 ${className}`}
          {...props}
        />
        <div className="ml-3">
          <label className="form-label cursor-pointer">
            {label}
          </label>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              {description}
            </p>
          )}
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
});

Checkbox.displayName = "Checkbox";

// Radio Group Component
interface RadioOption {
  value: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

interface RadioGroupProps {
  name: string;
  label: string;
  options: RadioOption[];
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  help?: string;
  required?: boolean;
}

export function RadioGroup({
  name,
  label,
  options,
  value,
  onChange,
  error,
  help,
  required
}: RadioGroupProps) {
  return (
    <div className="form-group">
      <fieldset>
        <legend className={`form-label ${required ? 'required' : ''}`}>
          {label}
        </legend>
        <div className="mt-2 space-y-3">
          {options.map((option) => (
            <div key={option.value} className="flex items-start">
              <input
                type="radio"
                name={name}
                value={option.value}
                checked={value === option.value}
                onChange={(e) => onChange?.(e.target.value)}
                disabled={option.disabled}
                className="form-radio mt-1"
              />
              <div className="ml-3">
                <label className="form-label cursor-pointer">
                  {option.label}
                </label>
                {option.description && (
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {option.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      {error && <div className="form-error">{error}</div>}
      {help && !error && <div className="form-help">{help}</div>}
    </div>
  );
}

// Form Card Component
interface FormCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

export function FormCard({ 
  title, 
  description, 
  children, 
  footer, 
  className = "" 
}: FormCardProps) {
  return (
    <div className={`card ${className}`}>
      {(title || description) && (
        <div className="card-header">
          {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>}
          {description && <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{description}</p>}
        </div>
      )}
      <div className="card-body">
        {children}
      </div>
      {footer && (
        <div className="card-footer">
          {footer}
        </div>
      )}
    </div>
  );
}

// Search Input Component
interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(({
  label,
  onClear,
  value,
  className = "",
  ...props
}, ref) => {
  return (
    <div className="form-group">
      {label && <label className="form-label">{label}</label>}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      <input
        ref={ref}
        type="search"
        className={`form-input has-icon ${value && onClear ? 'pr-10' : ''} ${className}`}
        value={value}
        {...props}
      />
      {value && onClear && (
        <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
          <button
            type="button"
            onClick={onClear}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}
      </div>
    </div>
  );
});

SearchInput.displayName = "SearchInput";

// File Input Component
interface FileInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  accept?: string;
  maxSize?: number; // in MB
  error?: string;
  help?: string;
  required?: boolean;
}

export const FileInput = forwardRef<HTMLInputElement, FileInputProps>(({
  label,
  accept,
  maxSize,
  error,
  help,
  required,
  onChange,
  className = "",
  ...props
}, ref) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && maxSize && file.size > maxSize * 1024 * 1024) {
      alert(`El archivo debe ser menor a ${maxSize}MB`);
      e.target.value = '';
      return;
    }
    onChange?.(e);
  };

  return (
    <div className="form-group">
      <label className={`form-label ${required ? 'required' : ''}`}>
        {label}
      </label>
      <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-lg hover:border-gray-400 dark:hover:border-gray-500 transition-colors">
        <div className="space-y-1 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-500 dark:text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
            <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <div className="flex text-sm text-gray-600 dark:text-gray-400">
            <label className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-brand-600 hover:text-brand-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-brand-500">
              <span>Subir archivo</span>
              <input
                ref={ref}
                type="file"
                accept={accept}
                onChange={handleChange}
                className="sr-only"
                {...props}
              />
            </label>
            <p className="pl-1">o arrastrar y soltar</p>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {accept ? accept.replace(/\./g, '').toUpperCase() : 'Todos los archivos'}
            {maxSize && ` hasta ${maxSize}MB`}
          </p>
        </div>
      </div>
      {error && <div className="form-error">{error}</div>}
      {help && !error && <div className="form-help">{help}</div>}
    </div>
  );
});

FileInput.displayName = "FileInput";