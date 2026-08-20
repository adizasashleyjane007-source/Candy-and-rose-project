import { ArrowLeft, ArrowRight } from "lucide-react";

interface PaginationProps {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
}

export default function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

    const getPageNumbers = () => {
        const pages: (number | string)[] = [];
        
        if (totalPages <= 5) {
            for (let i = 1; i <= totalPages; i++) {
                pages.push(i);
            }
        } else {
            if (safeCurrentPage <= 3) {
                pages.push(1, 2, 3, '...', totalPages);
            } else if (safeCurrentPage >= totalPages - 2) {
                pages.push(1, '...', totalPages - 2, totalPages - 1, totalPages);
            } else {
                pages.push(1, '...', safeCurrentPage - 1, safeCurrentPage, safeCurrentPage + 1, '...', totalPages);
            }
        }
        
        return pages;
    };

    return (
        <div className="flex flex-wrap items-center justify-center mt-6 mb-4 gap-2 px-2">
            <button
                disabled={safeCurrentPage === 1}
                onClick={() => onPageChange(Math.max(1, safeCurrentPage - 1))}
                className="p-1.5 flex items-center justify-center text-gray-400 hover:text-pink-500 disabled:opacity-50 transition-colors bg-white rounded-xl border border-transparent hover:border-pink-200 shadow-sm disabled:shadow-none"
            >
                <ArrowLeft className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none px-1">
                {getPageNumbers().map((page, index) => (
                    <button
                        key={index}
                        disabled={page === '...'}
                        onClick={() => typeof page === 'number' && onPageChange(page)}
                        className={`min-w-[32px] sm:w-9 sm:h-9 h-8 flex items-center justify-center rounded-xl text-xs sm:text-sm transition-all ${
                            page === '...'
                                ? "font-semibold text-gray-400 bg-transparent cursor-default"
                                : safeCurrentPage === page
                                ? "font-bold text-white bg-pink-500 shadow-md shadow-pink-200"
                                : "font-semibold text-gray-500 bg-white border border-pink-100 hover:border-pink-300"
                        }`}
                    >
                        {page}
                    </button>
                ))}
            </div>

            <button
                disabled={safeCurrentPage === totalPages}
                onClick={() => onPageChange(Math.min(totalPages, safeCurrentPage + 1))}
                className="p-1.5 flex items-center justify-center text-gray-400 hover:text-pink-500 disabled:opacity-50 transition-colors bg-white rounded-xl border border-transparent hover:border-pink-200 shadow-sm disabled:shadow-none"
            >
                <ArrowRight className="w-5 h-5" />
            </button>
        </div>
    );
}
