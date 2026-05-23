export type Service = {
  id: string;
  name: string;
  categoryId: string;
  url: string;
  description?: string | null;
  icon: string;
  color: string;
  order: number;
  category?: Category;
};

export type Category = {
  id: string;
  name: string;
  icon: string;
  color: string;
  order: number;
  services?: Service[];
};