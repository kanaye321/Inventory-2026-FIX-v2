import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { AssetStatusType } from "@shared/schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}



export function formatDate(dateString: string | undefined): string {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(date);
  } catch (e) {
    return dateString;
  }
}

export function formatDateWithTime(dateString: string | undefined): string {
  if (!dateString) return "-";

  try {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
    }).format(date);
  } catch (e) {
    return dateString;
  }
}

export function getTimeSince(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  let interval = Math.floor(seconds / 31536000);
  if (interval >= 1) {
    return interval === 1 ? "1 year ago" : `${interval} years ago`;
  }

  interval = Math.floor(seconds / 2592000);
  if (interval >= 1) {
    return interval === 1 ? "1 month ago" : `${interval} months ago`;
  }

  interval = Math.floor(seconds / 86400);
  if (interval >= 1) {
    return interval === 1 ? "1 day ago" : `${interval} days ago`;
  }

  interval = Math.floor(seconds / 3600);
  if (interval >= 1) {
    return interval === 1 ? "1 hour ago" : `${interval} hours ago`;
  }

  interval = Math.floor(seconds / 60);
  if (interval >= 1) {
    return interval === 1 ? "1 minute ago" : `${interval} minutes ago`;
  }

  return seconds <= 5 ? "just now" : `${Math.floor(seconds)} seconds ago`;
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800';
    case 'Deployed':
      return 'bg-blue-100 text-blue-800';
    case 'On-Hand':
      return 'bg-yellow-100 text-yellow-800';
    case 'Reserved':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

// CSV export functionality
export function downloadCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: Array<{
    key: keyof T;
    label: string;
  }>
) {
  if (data.length === 0) return;

  // Use provided columns or infer from first item
  const cols = columns || Object.keys(data[0]).map(key => ({
    key: key as keyof T,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
  }));

  // Create CSV content
  const headers = cols.map(col => col.label).join(',');
  const rows = data.map(item => 
    cols.map(col => {
      const value = item[col.key];
      // Handle values that might contain commas or quotes
      if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value || '';
    }).join(',')
  );

  const csvContent = [headers, ...rows].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  if (link.download !== undefined) {
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

export function truncateText(text: string | undefined, maxLength: number): string {
  if (!text) return "";
  return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
}