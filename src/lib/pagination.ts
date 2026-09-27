export interface PaginationParams {
  page: number;
  limit: number;
  skip: number;
}

export function parsePaginationParams(
  searchParams?: { page?: string | number; limit?: string | number },
  defaultLimit: number = 25
): PaginationParams {
  let page = parseInt(String(searchParams?.page || "1"), 10);
  if (isNaN(page) || page < 1) page = 1;

  let rawLimit = searchParams?.limit !== undefined ? parseInt(String(searchParams.limit), 10) : defaultLimit;
  let limit = isNaN(rawLimit) ? defaultLimit : rawLimit;

  if (limit < 10) limit = 10;
  if (limit > 100) limit = 100;

  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

export function genererTranchesPagination(
  pageCourante: number,
  totalPages: number
): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (pageCourante <= 3) {
    return [1, 2, 3, 4, "...", totalPages];
  }

  if (pageCourante >= totalPages - 2) {
    return [1, "...", totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [
    1,
    "...",
    pageCourante - 1,
    pageCourante,
    pageCourante + 1,
    "...",
    totalPages,
  ];
}
