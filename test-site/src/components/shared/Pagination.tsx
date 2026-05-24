import { ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  page?: number;
  totalPages?: number;
  rowsPerPage?: number;
}

export default function Pagination({
  page = 1,
  totalPages = 10,
  rowsPerPage = 13,
}: PaginationProps) {
  return (
    <div className="pagination">
      <span>Page {page} of {totalPages}</span>
      <div className="pagination__right">
        <span>Show row</span>
        <select defaultValue={String(rowsPerPage)}>
          <option value="13">13</option>
          <option value="25">25</option>
          <option value="50">50</option>
        </select>
        <button type="button" className="icon-btn"><ChevronLeft size={16} /></button>
        <button type="button" className="icon-btn"><ChevronRight size={16} /></button>
      </div>
    </div>
  );
}
