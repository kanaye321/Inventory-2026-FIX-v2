import React, { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  UploadIcon,
  FileTextIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XIcon,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import {
  Progress
} from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface CSVMonitorInventory {
  seatNumber: string;
  knoxId?: string;
  assetNumber?: string;
  serialNumber?: string;
  model?: string;
  remarks?: string;
  department?: string;
}

interface MonitorInventoryCSVImportProps {
  onImportComplete: () => void;
}

export default function MonitorInventoryCSVImport({ onImportComplete }: MonitorInventoryCSVImportProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedMonitors, setParsedMonitors] = useState<CSVMonitorInventory[] | null>(null);
  const [importStatus, setImportStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  } | null>(null);

  const parseCSV = (csvContent: string): CSVMonitorInventory[] => {
    try {
      // Enhanced CSV parser for browser - handles quoted fields with commas
      const parseCSVLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          const nextChar = line[i + 1];
          
          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              // Handle escaped quotes
              current += '"';
              i++;
            } else {
              // Toggle quote state
              inQuotes = !inQuotes;
            }
          } else if (char === ',' && !inQuotes) {
            // End of field
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      };

      const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
      
      if (lines.length < 2) {
        throw new Error('CSV file must contain at least a header row and one data row');
      }

      // Parse header row
      const headerLine = lines[0].replace(/^\uFEFF/, ''); // Remove BOM
      const headers = parseCSVLine(headerLine).map(h => h.toLowerCase().replace(/"/g, ''));

      // Parse data rows
      const monitors: CSVMonitorInventory[] = [];

      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, ''));

        // Create monitor object with all optional fields
        const item: any = {};

        headers.forEach((header, index) => {
          const value = values[index] || '';
          const cleanValue = value && value !== 'N/A' && value !== 'NULL' && value !== '' ? value : '';

          switch (header) {
            case 'seatnumber':
            case 'seat_number':
            case 'seat number':
            case 'seat':
              item.seatNumber = cleanValue;
              break;
            case 'knoxid':
            case 'knox_id':
            case 'knox id':
              item.knoxId = cleanValue;
              break;
            case 'assetnumber':
            case 'asset_number':
            case 'asset number':
            case 'asset':
              item.assetNumber = cleanValue;
              break;
            case 'serialnumber':
            case 'serial_number':
            case 'serial number':
            case 'serial':
              item.serialNumber = cleanValue;
              break;
            case 'model':
              item.model = cleanValue;
              break;
            case 'remarks':
            case 'notes':
            case 'description':
              item.remarks = cleanValue;
              break;
            case 'department':
            case 'dept':
              item.department = cleanValue;
              break;
          }
        });

        // Add monitor even if all fields are empty (all optional now)
        monitors.push(item as CSVMonitorInventory);
      }

      if (monitors.length === 0) {
        throw new Error('No data rows found in CSV file');
      }

      return monitors;
    } catch (error: any) {
      console.error('CSV parsing error:', error);
      throw new Error(error?.message || 'Failed to parse CSV file');
    }
  };

  const convertCSVToMonitorInventory = (csvMonitors: CSVMonitorInventory[]) => {
    return csvMonitors.map((item) => {
      const getValue = (value: string | undefined) => {
        const trimmed = value?.trim();
        return trimmed && trimmed !== '' && trimmed !== '-' ? trimmed : null;
      };

      return {
        seatNumber: getValue(item.seatNumber),
        knoxId: getValue(item.knoxId),
        assetNumber: getValue(item.assetNumber),
        serialNumber: getValue(item.serialNumber),
        model: getValue(item.model),
        remarks: getValue(item.remarks),
        department: getValue(item.department),
      };
    });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      setParsedMonitors(null);
      setParseError(null);
      return;
    }

    const file = e.target.files[0];

    // Validate file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseError('Please select a CSV file');
      toast({
        title: "Invalid file type",
        description: "Please select a CSV file (.csv)",
        variant: "destructive",
      });
      return;
    }

    const maxSizeInMB = 25;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;

    if (file.size > maxSizeInBytes) {
      setParseError(`File size too large. Please use a CSV file smaller than ${maxSizeInMB}MB.`);
      toast({
        title: "File too large",
        description: `Please select a CSV file smaller than ${maxSizeInMB}MB`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setParseError(null);
    setParsedMonitors(null);
    setImportSummary(null);
    setImportProgress(0);

    const reader = new FileReader();
    reader.onerror = () => {
      setParseError('Failed to read file');
      toast({
        title: "File read error",
        description: "Failed to read the CSV file",
        variant: "destructive",
      });
    };
    
    reader.onload = (event) => {
      try {
        if (!event.target || !event.target.result) {
          throw new Error('Failed to read file content');
        }
        
        const csvContent = event.target.result as string;
        
        // Check if content looks like CSV
        if (csvContent.trim().startsWith('<!DOCTYPE') || csvContent.trim().startsWith('<html')) {
          throw new Error('Invalid file format: HTML file detected. Please upload a CSV file.');
        }
        
        if (csvContent.trim().startsWith('{') || csvContent.trim().startsWith('[')) {
          throw new Error('Invalid file format: JSON file detected. Please upload a CSV file.');
        }
        
        const monitors = parseCSV(csvContent);
        setParsedMonitors(monitors);
        toast({
          title: "File parsed successfully",
          description: `Found ${monitors.length} monitor entries ready for import.`,
        });
      } catch (error) {
        console.error("CSV parse error:", error);
        const errorMessage = error instanceof Error ? error.message : 'Failed to parse CSV file';
        setParseError(errorMessage);
        toast({
          title: "Parse failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(file, 'UTF-8');
  };

  const handleImport = () => {
    if (!parsedMonitors) return;

    try {
      const monitorsToImport = convertCSVToMonitorInventory(parsedMonitors);
      importMutation.mutate(monitorsToImport);
    } catch (error) {
      toast({
        title: "Import failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const importMutation = useMutation({
    mutationFn: async (monitors: any[]) => {
      setImportStatus("uploading");
      setImportProgress(25);

      const response = await fetch("/api/monitor-inventory/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ monitors }),
      });

      setImportProgress(75);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Import failed");
      }

      const data = await response.json();
      setImportProgress(100);
      return data;
    },
    onSuccess: (data) => {
      setImportStatus("success");
      setImportSummary(data);
      queryClient.invalidateQueries({ queryKey: ['/api/monitor-inventory'] });

      toast({
        title: "Import successful",
        description: `${data.successful} monitor entries imported successfully.`,
      });

      setTimeout(() => {
        onImportComplete();
      }, 2000);
    },
    onError: (error) => {
      setImportStatus("error");
      toast({
        title: "Import failed",
        description: (error as Error).message || "Failed to import monitor inventory",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    setSelectedFile(null);
    setParsedMonitors(null);
    setParseError(null);
    setImportSummary(null);
    setImportProgress(0);
    setImportStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        seatNumber: "A001",
        knoxId: "KNOX001",
        assetNumber: "MON-001",
        serialNumber: "SN123456789",
        model: "Dell P2414H",
        remarks: "Primary monitor for workstation",
        department: "IT Department"
      },
      {
        seatNumber: "B002",
        knoxId: "KNOX002",
        assetNumber: "MON-002",
        serialNumber: "SN987654321",
        model: "HP E24 G4",
        remarks: "Secondary monitor",
        department: "Finance Department"
      }
    ];

    const csvContent = [
      "seatNumber,knoxId,assetNumber,serialNumber,model,remarks,department",
      ...templateData.map(row => 
        `"${row.seatNumber}","${row.knoxId}","${row.assetNumber}","${row.serialNumber}","${row.model}","${row.remarks}","${row.department}"`
      )
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "monitor_inventory_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Import Monitor Inventory from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file with monitor inventory data to bulk import monitors. Maximum file size: 25MB.
          <br />
          <strong>Optional columns:</strong> seatNumber, knoxId, assetNumber, serialNumber, model, remarks, department
        </CardDescription>
      </CardHeader>
      <CardContent>
        {parseError && (
          <Alert variant="destructive" className="mb-4">
            <AlertTriangleIcon className="h-4 w-4" />
            <AlertTitle>Parse Error</AlertTitle>
            <AlertDescription>{parseError}</AlertDescription>
          </Alert>
        )}

        {importSummary && (
          <Alert variant={importSummary.failed > 0 ? "destructive" : "default"} className="mb-4">
            <CheckCircleIcon className="h-4 w-4" />
            <AlertTitle>Import Summary</AlertTitle>
            <AlertDescription>
              <div className="space-y-1">
                <p>Total: {importSummary.total}, Created: {importSummary.successful}, Failed: {importSummary.failed}</p>
                {importSummary.errors.length > 0 && (
                  <div className="mt-2">
                    <p className="font-medium">Errors:</p>
                    <ul className="list-disc pl-4 text-sm">
                      {importSummary.errors.slice(0, 5).map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                      {importSummary.errors.length > 5 && (
                        <li>... and {importSummary.errors.length - 5} more errors</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          {/* File Selection */}
          <div className="flex items-center gap-4">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".csv"
              className="hidden"
            />
            <Button 
              variant="outline" 
              onClick={() => fileInputRef.current?.click()}
              disabled={importStatus === "uploading"}
            >
              <UploadIcon className="mr-2 h-4 w-4" />
              Select CSV File
            </Button>

            {selectedFile && (
              <div className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded border">
                <FileTextIcon className="h-4 w-4 text-gray-500" />
                <span className="text-sm truncate max-w-[250px]">
                  {selectedFile.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={resetForm}
                  disabled={importStatus === "uploading"}
                >
                  <XIcon className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>

          {/* Progress Bar */}
          {importStatus === "uploading" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Importing monitors...</span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full" />
            </div>
          )}

          {/* Preview Table */}
          {parsedMonitors && parsedMonitors.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Preview ({parsedMonitors.length} items)</h3>
              <div className="border rounded-lg max-h-60 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Seat Number</TableHead>
                      <TableHead>Knox ID</TableHead>
                      <TableHead>Asset Number</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Department</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedMonitors.slice(0, 10).map((monitor, index) => (
                      <TableRow key={index}>
                        <TableCell>{monitor.seatNumber || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{monitor.knoxId || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{monitor.assetNumber || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{monitor.serialNumber || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{monitor.model || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{monitor.department || <span className="text-gray-400">—</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedMonitors.length > 10 && (
                  <div className="p-2 text-center text-sm text-gray-500 border-t">
                    ... and {parsedMonitors.length - 10} more items
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={resetForm}
              disabled={importStatus === "uploading"}
            >
              Reset
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                importStatus === "uploading" ||
                importStatus === "success" ||
                !parsedMonitors ||
                parsedMonitors.length === 0
              }
            >
              {importStatus === "uploading" ? "Importing..." : `Import ${parsedMonitors?.length || 0} Items`}
            </Button>
          </div>
          <Button variant="secondary" onClick={handleDownloadTemplate}>
            Download CSV Template
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}