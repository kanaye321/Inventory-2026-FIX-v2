
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
  FileDownIcon,
} from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import {
  parseCSV,
  convertCSVToAssets,
  CSVAsset,
  downloadCSV,
} from "@/lib/csv-import";
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

export default function CSVImport() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [parsedAssets, setParsedAssets] = useState<CSVAsset[] | null>(null);
  const [importStatus, setImportStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    successful: number;
    updated: number;
    failed: number;
    errors: string[];
  } | null>(null);
  const [forceImport, setForceImport] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) {
      setSelectedFile(null);
      setParsedAssets(null);
      setParseError(null);
      return;
    }

    const file = e.target.files[0];
    
    // Check file size (limit to 25MB to prevent server overload)
    const maxSizeInMB = 25;
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    
    if (file.size > maxSizeInBytes) {
      setParseError(`File size too large. Please use a CSV file smaller than ${maxSizeInMB}MB. Current file size: ${(file.size / (1024 * 1024)).toFixed(2)}MB`);
      toast({
        title: "File too large",
        description: `Please select a CSV file smaller than ${maxSizeInMB}MB`,
        variant: "destructive",
      });
      return;
    }

    setSelectedFile(file);
    setParseError(null);
    setParsedAssets(null);
    setImportSummary(null);
    setImportProgress(0);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const csvContent = e.target?.result as string;
        const assets = parseCSV(csvContent);
        setParsedAssets(assets);
        toast({
          title: "File parsed successfully",
          description: `Found ${assets.length} assets ready for import.`,
        });
      } catch (error) {
        console.error("CSV parse error:", error);
        setParseError((error as Error).message);
        toast({
          title: "Parse failed",
          description: (error as Error).message,
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (!parsedAssets) return;

    try {
      const assetsToImport = convertCSVToAssets(parsedAssets);
      if (!Array.isArray(assetsToImport) || assetsToImport.length === 0) {
        toast({
          title: "Import failed",
          description: "No valid assets found to import.",
          variant: "destructive",
        });
        return;
      }

      importMutation.mutate({ assets: assetsToImport, forceImport });
    } catch (error) {
      toast({
        title: "Import failed",
        description: (error as Error).message,
        variant: "destructive",
      });
    }
  };

  const importMutation = useMutation({
    mutationFn: async ({ assets, forceImport }: { assets: any[], forceImport: boolean }) => {
      setImportStatus("uploading");
      setImportProgress(0);

      // For large datasets (>1000 rows), process in batches
      const BATCH_SIZE = 500;
      const shouldBatch = assets.length > 1000;

      if (shouldBatch) {
        console.log(`Processing ${assets.length} assets in batches of ${BATCH_SIZE}`);
        
        let totalProcessed = 0;
        const results = {
          total: assets.length,
          successful: 0,
          updated: 0,
          failed: 0,
          errors: []
        };

        // Process in batches
        for (let i = 0; i < assets.length; i += BATCH_SIZE) {
          const batch = assets.slice(i, i + BATCH_SIZE);
          const batchNumber = Math.floor(i / BATCH_SIZE) + 1;
          const totalBatches = Math.ceil(assets.length / BATCH_SIZE);
          
          console.log(`Processing batch ${batchNumber}/${totalBatches} (${batch.length} items)`);
          
          try {
            const response = await fetch("/api/assets/import", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ assets: batch, forceImport }),
            });

            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.message || `Batch ${batchNumber} failed`);
            }

            const batchResult = await response.json();
            
            // Accumulate results
            results.successful += batchResult.successful || 0;
            results.updated += batchResult.updated || 0;
            results.failed += batchResult.failed || 0;
            if (batchResult.errors) {
              results.errors.push(...batchResult.errors);
            }

            totalProcessed += batch.length;
            const progressPercent = Math.floor((totalProcessed / assets.length) * 100);
            setImportProgress(progressPercent);

            // Small delay between batches to prevent overwhelming the server
            if (i + BATCH_SIZE < assets.length) {
              await new Promise(resolve => setTimeout(resolve, 200));
            }

          } catch (batchError) {
            console.error(`Batch ${batchNumber} failed:`, batchError);
            results.failed += batch.length;
            results.errors.push(`Batch ${batchNumber}: ${batchError.message}`);
          }
        }

        return results;
      } else {
        // Single request for smaller datasets
        setImportProgress(25);

        const response = await fetch("/api/assets/import", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ assets, forceImport }),
        });

        setImportProgress(75);

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || "Import failed");
        }

        const data = await response.json();
        setImportProgress(100);
        return data;
      }
    },
    onSuccess: (data) => {
      setImportStatus("success");
      setImportSummary(data);
      queryClient.invalidateQueries({ queryKey: ["/api/assets"] });
      queryClient.invalidateQueries({ queryKey: ["/api/stats"] });

      if (data.failed > 0) {
        toast({
          title: "Import completed with errors",
          description: `${data.successful} assets created, ${data.updated || 0} assets updated, ${data.failed} failed.`,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Import successful",
          description: `${data.successful} assets created, ${data.updated || 0} assets updated successfully.`,
        });
      }
    },
    onError: (error) => {
      setImportStatus("error");
      toast({
        title: "Import failed",
        description: (error as Error).message || "Failed to import assets",
        variant: "destructive",
      });
    },
  });

  const handleDownloadTemplate = () => {
    const templateData = [
      {
        assetTag: "SRPH-LAP-001",
        name: "Sample Laptop",
        category: "Laptop",
        status: "available",
        condition: "Good",
        serialNumber: "SN123456789",
        model: "ThinkPad X1 Carbon",
        purchaseDate: "2023-01-15",
        manufacturer: "Lenovo",
        purchaseCost: "1200.00",
        location: "Head Office - Room 201",
        knoxId: "KNOX001",
        ipAddress: "192.168.1.100",
        macAddress: "00:1A:2B:3C:4D:5E",
        osType: "Windows 11 Pro",
        department: "IT Department",
        description: "High-performance laptop for development work",
        warranty: "2026-01-15",
        supplier: "Tech Solutions Inc"
      },
      {
        assetTag: "SRPH-DES-001",
        name: "Sample Desktop",
        category: "Desktop",
        status: "deployed",
        condition: "Good",
        serialNumber: "SN987654321",
        model: "OptiPlex 7090",
        purchaseDate: "2023-02-10",
        manufacturer: "Dell",
        purchaseCost: "800.00",
        location: "Branch Office - Floor 3",
        knoxId: "KNOX002",
        ipAddress: "192.168.1.101",
        macAddress: "00:1A:2B:3C:4D:5F",
        osType: "Windows 10 Pro",
        department: "Finance Department",
        description: "Desktop computer for office productivity",
        warranty: "2026-02-10",
        supplier: "Dell Direct"
      },
      {
        assetTag: "SRPH-SER-001",
        name: "Sample Server",
        category: "Server",
        status: "available",
        condition: "Good",
        serialNumber: "SN456789123",
        model: "PowerEdge R740",
        purchaseDate: "2023-03-20",
        manufacturer: "Dell",
        purchaseCost: "3500.00",
        location: "Data Center - Rack A1",
        knoxId: "",
        ipAddress: "192.168.1.50",
        macAddress: "00:1A:2B:3C:4D:60",
        osType: "Windows Server 2022",
        department: "IT Department",
        description: "Production server for web applications",
        warranty: "2028-03-20",
        supplier: "Enterprise Solutions"
      }
    ];

    const csvContent = [
      "assetTag,name,category,status,condition,serialNumber,model,purchaseDate,manufacturer,purchaseCost,location,knoxId,ipAddress,macAddress,osType,department,description,warranty,supplier",
      ...templateData.map(row => 
        `${row.assetTag},"${row.name}",${row.category},${row.status},${row.condition},${row.serialNumber},"${row.model}",${row.purchaseDate},"${row.manufacturer}",${row.purchaseCost},"${row.location}",${row.knoxId},${row.ipAddress},${row.macAddress},"${row.osType}","${row.department}","${row.description}",${row.warranty},"${row.supplier}"`
      )
    ].join('\n');

    downloadCSV(csvContent, 'asset-import-template.csv');

    toast({
      title: "Template Downloaded",
      description: "Comprehensive asset import template with all fields has been downloaded successfully."
    });
  };

  const resetForm = () => {
    setSelectedFile(null);
    setParsedAssets(null);
    setParseError(null);
    setImportSummary(null);
    setImportProgress(0);
    setImportStatus("idle");
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-xl">Import Assets from CSV</CardTitle>
        <CardDescription>
          Upload a CSV file with asset data to bulk import assets. Maximum file size: 25MB. Large datasets (1000+ rows) are processed in batches for optimal performance.
          <br />
          <strong>All columns are optional:</strong> assetTag, name, category, status, condition, serialNumber, model, purchaseDate, manufacturer, purchaseCost, location, knoxId, ipAddress, macAddress, osType, department, description, warranty, supplier
          <br />
          <em>Note: All fields can be left completely blank. Only category defaults to 'Laptop' and status defaults to 'Available' if not provided.</em>
          <br />
          <strong>Performance estimate:</strong> ~3,000 rows typically process in 30-60 seconds depending on server load.
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
                <p>Total: {importSummary.total}, Created: {importSummary.successful}, Updated: {importSummary.updated || 0}, Failed: {importSummary.failed}</p>
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

            <Button 
              variant="outline" 
              onClick={handleDownloadTemplate}
            >
              <FileDownIcon className="mr-2 h-4 w-4" />
              Download Template
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
                <span>
                  {parsedAssets && parsedAssets.length > 1000 
                    ? `Processing ${parsedAssets.length} assets in batches...` 
                    : "Importing assets..."
                  }
                </span>
                <span>{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="w-full" />
              {parsedAssets && parsedAssets.length > 1000 && (
                <p className="text-xs text-muted-foreground">
                  Large dataset detected. Processing in batches of 500 for optimal performance.
                </p>
              )}
            </div>
          )}

          {/* Preview Table */}
          {parsedAssets && parsedAssets.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-lg font-medium">Preview ({parsedAssets.length} assets)</h3>
              <div className="border rounded-lg max-h-60 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Asset Tag</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Serial Number</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Manufacturer</TableHead>
					  <TableHead>Purchase Date</TableHead>
                      <TableHead>Model</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Department</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedAssets.slice(0, 10).map((asset, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-mono text-sm">{asset.assetTag || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{asset.name || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell className="font-mono text-sm">{asset.serialNumber || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{asset.category || <span className="text-gray-400 italic">Laptop (default)</span>}</TableCell>
                        <TableCell>{asset.manufacturer || <span className="text-gray-400">—</span>}</TableCell>
						<TableCell>{asset.purchaseDate || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{asset.model || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{asset.location || <span className="text-gray-400">—</span>}</TableCell>
                        <TableCell>{asset.department || <span className="text-gray-400">—</span>}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {parsedAssets.length > 10 && (
                  <div className="p-2 text-center text-sm text-gray-500 border-t">
                    ... and {parsedAssets.length - 10} more assets
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import Options */}
          {parsedAssets && parsedAssets.length > 0 && (
            <div className="space-y-3 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <h4 className="text-sm font-medium">Import Options</h4>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="forceImport"
                  checked={forceImport}
                  onChange={(e) => setForceImport(e.target.checked)}
                  className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="forceImport" className="text-sm text-gray-700 dark:text-gray-300">
                  Force import all records (skip validations and duplicate checks)
                </label>
              </div>
              {forceImport && (
                <div className="text-xs text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20 p-2 rounded border border-orange-200 dark:border-orange-800">
                  <strong>Warning:</strong> This will import all records without checking for duplicates. 
                  Existing records with the same asset tags will not be updated, and new records will be created regardless.
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end gap-2"></div>
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
                !parsedAssets ||
                parsedAssets.length === 0
              }
            >
              {importStatus === "uploading" ? "Importing..." : 
               forceImport ? `Force Import ${parsedAssets?.length || 0} Assets` : 
               `Import ${parsedAssets?.length || 0} Assets`}
            </Button>
          </div>
        </CardContent>
      </Card>
  );
}
