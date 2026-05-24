import { Search } from 'lucide-react';

interface SearchBarProps {
  placeholder?: string;
  shortcut?: string;
  inline?: boolean;
}

export default function SearchBar({
  placeholder = 'Search',
  shortcut = '⌘ K',
  inline = false,
}: SearchBarProps) {
  return (
    <div className={`search-bar${inline ? ' search-bar--inline' : ''}`}>
      <Search size={inline ? 16 : 18} />
      <input type="text" placeholder={placeholder} />
      {shortcut && <kbd>{shortcut}</kbd>}
    </div>
  );
}
