import { InsertAsset, InsertComponent, InsertAccessory, AssetStatus, AccessoryStatus } from "@shared/schema";
import { downloadCSV } from "./utils";

// VM types for CSV import
interface VirtualMachine {
  id: number;
  // VM Identification
  vmId: string;
  vmName: string;
  vmStatus: string;
  vmIp: string;
  internetAccess: boolean;
  vmOs: string;
  vmOsVersion: string;
  // Host Details
  hypervisor: string;
  hostname: string;
  hostModel: string;
  hostIp: string;
  hostOs: string;
  rack: string;
  // Usage and tracking
  deployedBy: string;
  user: string;
  department: string;
  startDate: string;
  endDate: string;
  jiraTicket: string;
  remarks: string;
  dateDeleted: string | null;
}

type NewVirtualMachine = Omit<VirtualMachine, "id">;

export type CSVVM = {
  // VM Identification
  vmId: string;
  vmName: string;
  vmStatus?: string;
  vmIp?: string;
  internetAccess?: string;
  vmOs?: string;
  vmOsVersion?: string;
  // VM Resources
  cpuCount?: string;
  memoryGB?: string;
  diskCapacityGB?: string;
  guestOs?: string;
  powerState?: string;
  memoryMB?: string;
  diskGB?: string;
  macAddress?: string;
  vmwareTools?: string;
  cluster?: string;
  datastore?: string;
  // Host Details
  hypervisor: string;
  hostname?: string;
  hostModel?: string;
  hostIp?: string;
  hostOs?: string;
  rack?: string;
  // Usage and tracking
  deployedBy?: string;
  user?: string;
  requestor?: string;
  knoxId?: string;
  department?: string;
  startDate?: string;
  endDate?: string;
  jiraTicket?: string;
  jiraNumber?: string;
  approvalNumber?: string;
  remarks?: string;
};

export interface CSVAsset {
  assetTag?: string;
  name?: string;
  category?: string;
  status?: string;
  condition?: string;
  serialNumber: string;
  model?: string;
  purchaseDate?: string;
  manufacturer?: string;
  purchaseCost?: string;
  location?: string;
  knoxId?: string;
  ipAddress?: string;
  macAddress?: string;
  osType?: string;
  department?: string;
  description?: string;
  warranty?: string;
  supplier?: string;
  [key: string]: any; // Allow for additional custom fields
}

export type CSVComponent = {
  name: string;
  category: string;
  quantity?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
};

export type CSVConsumableAssignment = {
  consumableId: string;
  assignedTo: string;
  serialNumber?: string;
  knoxId?: string;
  quantity?: string;
  notes?: string;
};

export type CSVAccessory = {
  name: string;
  category: string;
  status?: string;
  quantity?: string;
  serialNumber?: string;
  manufacturer?: string;
  model?: string;
  notes?: string;
};

/**
 * Parse Excel file as CSV data
 */
export async function parseExcelFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        // For now, we'll treat Excel files as CSV by asking users to save as CSV
        // In a real implementation, you'd use a library like xlsx
        reject(new Error('Please save your Excel file as CSV format and upload the CSV file instead.'));
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Enhanced CSV parser that handles multi-line text within quoted fields and special characters
 */
function parseCSVLine(csvContent: string): string[][] {
  const result: string[][] = [];
  const lines = csvContent.split('\n');
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    let charIndex = 0;

    while (charIndex < line.length) {
      const char = line[charIndex];
      const nextChar = line[charIndex + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          // Handle escaped quotes within quoted field (double quotes "")
          currentField += '"';
          charIndex += 2;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
          charIndex++;
        }
      } else if (char === ',' && !inQuotes) {
        // End of field when not in quotes - preserve the value without trimming to keep special chars
        currentRow.push(currentField);
        currentField = '';
        charIndex++;
      } else {
        // Regular character - keep all special characters including @, :, ., -, etc.
        currentField += char;
        charIndex++;
      }
    }

    // If we're in quotes, add a newline and continue to next line
    if (inQuotes && lineIndex < lines.length - 1) {
      currentField += '\n';
    } else {
      // End of line and not in quotes, finish the field and row
      currentRow.push(currentField);
      
      // Only add non-empty rows
      if (currentRow.some(field => field.trim() !== '')) {
        // Trim each field but preserve internal structure
        result.push(currentRow.map(field => field.trim()));
      }
      
      currentRow = [];
      currentField = '';
      inQuotes = false;
    }
  }

  // Handle any remaining field/row
  if (currentField || currentRow.length > 0) {
    if (currentField) currentRow.push(currentField);
    if (currentRow.length > 0 && currentRow.some(field => field.trim() !== '')) {
      result.push(currentRow.map(field => field.trim()));
    }
  }

  return result;
}

/**
 * Parse a CSV file containing asset data
 * Required fields: serialNumber
 * Optional fields: All other asset fields
 */
export function parseCSV(csvContent: string): CSVAsset[] {
  const rows = parseCSVLine(csvContent);

  if (rows.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Parse header row
  const headers = rows[0].map(header => header.trim().toLowerCase());

  // No required headers - all fields are optional

  // Parse data rows
  const assets: CSVAsset[] = [];
  let emptyRowsSkipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];

    // Skip completely empty rows
    if (values.length === 0 || values.every(val => !val || val.trim() === '')) {
      emptyRowsSkipped++;
      continue;
    }

    // Handle rows with fewer columns than headers (common in CSV exports)
    while (values.length < headers.length) {
      values.push('');
    }

    if (values.length > headers.length) {
      console.warn(`Row ${i + 1} has ${values.length} values, but header has ${headers.length} columns. Truncating extra values.`);
      values.splice(headers.length);
    }

    const asset: any = {};
    let hasAnyData = false;

    headers.forEach((header, index) => {
      let value = values[index] || '';

      // Replace empty cells with "-" but preserve multi-line content
      if (!value || value.trim() === '' || value === 'N/A' || value === 'NULL') {
        value = '-';
      } else {
        // Trim whitespace but preserve internal newlines
        value = value.trim();
      }

      if (value !== '-') {
        hasAnyData = true; // Mark that this row has some data
      }

      // Map CSV headers to asset properties with comprehensive field mapping
      switch (header) {
        case 'knoxid':
        case 'knox_id':
        case 'knox id':
          asset.knoxId = value;
          break;
        case 'serialnumber':
        case 'serial_number':
        case 'serial number':
        case 'serial':
          asset.serialNumber = value;
          break;
        case 'assettag':
        case 'asset tag':
        case 'asset_tag':
        case 'tag':
          asset.assetTag = value;
          break;
        case 'name':
        case 'asset name':
        case 'asset_name':
        case 'devicename':
        case 'device_name':
        case 'device name':
          asset.name = value;
          break;
        case 'category':
        case 'type':
        case 'device type':
        case 'device_type':
          asset.category = value;
          break;
        case 'status':
        case 'state':
          asset.status = value;
          break;
        case 'condition':
        case 'asset_condition':
        case 'asset condition':
          asset.condition = value;
          break;
        case 'model':
        case 'model_number':
        case 'model number':
          asset.model = value;
          break;
        case 'manufacturer':
        case 'brand':
        case 'make':
        case 'vendor':
          asset.manufacturer = value;
          break;
        case 'purchasedate':
                case 'purchaseDate':
        case 'purchase_date':
        case 'purchase date':
        case 'acquired_date':
        case 'acquired date':
        case 'dateacquired':
        case 'date_acquired':
          asset.purchaseDate = value;
          break;
        case 'purchasecost':
        case 'purchase_cost':
        case 'purchase cost':
        case 'cost':
        case 'price':
        case 'value':
          asset.purchaseCost = value;
          break;
        case 'location':
        case 'site':
        case 'office':
        case 'building':
        case 'room':
          asset.location = value;
          break;
        case 'ipaddress':
        case 'ip address':
        case 'ip_address':
        case 'ip':
          asset.ipAddress = value;
          break;
        case 'macaddress':
        case 'mac address':
        case 'mac_address':
        case 'mac':
          asset.macAddress = value;
          break;
        case 'ostype':
        case 'os type':
        case 'os_type':
        case 'os':
        case 'operating_system':
        case 'os version':
          asset.osType = value;
          break;
        case 'department':
        case 'dept':
        case 'division':
        case 'unit':
          asset.department = value;
          break;
        case 'description':
        case 'notes':
        case 'comments':
        case 'remarks':
          asset.description = value;
          break;
        case 'warranty':
        case 'warranty_date':
        case 'warranty date':
        case 'warranty_expiry':
        case 'warranty expiry':
          asset.warranty = value;
          break;
        case 'supplier':
        case 'vendor_name':
        case 'vendor name':
          asset.supplier = value;
          break;
        default:
          // Store unknown headers as custom fields
          asset[header] = value;
          break;
      }
    });

    // Only include rows that have actual data
    if (hasAnyData) {
      assets.push(asset as CSVAsset);
    } else {
      emptyRowsSkipped++;
      console.log(`Skipping empty data row ${i + 1}`);
    }
  }

  console.log(`CSV parsing completed: ${assets.length} assets parsed, ${emptyRowsSkipped} empty rows skipped`);
  return assets;
}

/**
 * Convert CSV assets to database asset format
 */
export function convertCSVToAssets(csvAssets: CSVAsset[]): InsertAsset[] {
  if (!Array.isArray(csvAssets)) {
    throw new Error('Invalid CSV data: expected array');
  }
  return csvAssets.map((csvAsset, index) => {
    // Properly handle condition mapping - preserve actual values from CSV
    let condition = 'Good'; // default
    if (csvAsset.condition && csvAsset.condition.trim() !== '') {
      const conditionValue = csvAsset.condition.trim();
      // Map common condition variations to our standard values
      if (conditionValue.toLowerCase() === 'bad' || conditionValue.toLowerCase() === 'poor' || conditionValue.toLowerCase() === 'damaged') {
        condition = 'Bad';
      } else if (conditionValue.toLowerCase() === 'good' || conditionValue.toLowerCase() === 'excellent' || conditionValue.toLowerCase() === 'working') {
        condition = 'Good';
      } else {
        // Use the exact value from CSV if it doesn't match common variations
        condition = conditionValue;
      }
    }

    return {
      assetTag: csvAsset.assetTag || null,
      name: csvAsset.name || null,
      serialNumber: csvAsset.serialNumber || '',
      category: csvAsset.category || 'Laptop', // Default category is required
      status: csvAsset.status as any || AssetStatus.AVAILABLE, // Default status is required
      condition: condition,
      model: csvAsset.model || null,
      purchaseDate: csvAsset.purchaseDate || null,
      manufacturer: csvAsset.manufacturer || null,
      purchaseCost: csvAsset.purchaseCost || null,
      location: csvAsset.location || null,
      knoxId: csvAsset.knoxId || null,
      ipAddress: csvAsset.ipAddress || null,
      macAddress: csvAsset.macAddress || null,
      osType: csvAsset.osType || null,
      department: csvAsset.department || null,
      notes: csvAsset.notes || null,
    };
  });
}

/**
 * Parse a CSV file containing component data
 */
export function parseComponentCSV(csvContent: string): CSVComponent[] {
  const lines = csvContent.split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Parse header row
  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());

  // Validate required headers
  const requiredHeaders = ['name', 'category'];
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`CSV file is missing required headers: ${missingHeaders.join(', ')}`);
  }

  // Parse data rows
  const components: CSVComponent[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines

    const values = lines[i].split(',').map(value => value.trim());

    if (values.length !== headers.length) {
      throw new Error(`Line ${i + 1} has ${values.length} values, but header has ${headers.length} columns`);
    }

    const component: any = {};

    headers.forEach((header, index) => {
      // Map CSV headers to component properties
      switch (header) {
        case 'name':
          component.name = values[index];
          break;
        case 'category':
          component.category = values[index];
          break;
        case 'quantity':
          component.quantity = values[index];
          break;
        case 'serialnumber':
        case 'serial number':
        case 'serial_number':
          component.serialNumber = values[index];
          break;
        case 'manufacturer':
          component.manufacturer = values[index];
          break;
        case 'model':
          component.model = values[index];
          break;
        case 'notes':
          component.notes = values[index];
          break;
        default:
          // Ignore unknown headers
          break;
      }
    });

    // Validate required fields
    if (!component.name || !component.category) {
      throw new Error(`Line ${i + 1} is missing required values`);
    }

    components.push(component as CSVComponent);
  }

  return components;
}

/**
 * Convert CSV components to database component format
 */
export function convertCSVToComponents(csvComponents: CSVComponent[]): InsertComponent[] {
  if (!Array.isArray(csvComponents)) {
    throw new Error('Invalid CSV data: expected array');
  }
  return csvComponents.map(csvComponent => {
    const quantity = csvComponent.quantity ? parseInt(csvComponent.quantity) : 1;

    return {
      name: csvComponent.name,
      category: csvComponent.category,
      description: null,
      purchaseDate: null,
      purchaseCost: null,
      location: null,
      serialNumber: csvComponent.serialNumber || null,
      model: csvComponent.model || null,
      manufacturer: csvComponent.manufacturer || null,
      notes: csvComponent.notes || `Imported via CSV`,
      quantity: quantity,
    };
  });
}

/**
 * Parse a CSV file containing accessory data
 */
export function parseAccessoryCSV(csvContent: string): CSVAccessory[] {
  const lines = csvContent.split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Parse header row
  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());

  // Validate required headers
  const requiredHeaders = ['name', 'category'];
  const missingHeaders = requiredHeaders.filter(header => !headers.includes(header));

  if (missingHeaders.length > 0) {
    throw new Error(`CSV file is missing required headers: ${missingHeaders.join(', ')}`);
  }

  // Parse data rows
  const accessories: CSVAccessory[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue; // Skip empty lines

    const values = lines[i].split(',').map(value => value.trim());

    if (values.length !== headers.length) {
      throw new Error(`Line ${i + 1} has ${values.length} values, but header has ${headers.length} columns`);
    }

    const accessory: any = {};

    headers.forEach((header, index) => {
      // Map CSV headers to accessory properties
      switch (header) {
        case 'name':
          accessory.name = values[index];
          break;
        case 'category':
          accessory.category = values[index];
          break;
        case 'status':
          accessory.status = values[index];
          break;
        case 'quantity':
          accessory.quantity = values[index];
          break;
        case 'serialnumber':
        case 'serial number':
        case 'serial_number':
          accessory.serialNumber = values[index];
          break;
        case 'manufacturer':
          accessory.manufacturer = values[index];
          break;
        case 'model':
          accessory.model = values[index];
          break;
        case 'notes':
          accessory.notes = values[index];
          break;
        default:
          // Ignore unknown headers
          break;
      }
    });

    // Validate required fields
    if (!accessory.name || !accessory.category) {
      throw new Error(`Line ${i + 1} is missing required values`);
    }

    accessories.push(accessory as CSVAccessory);
  }

  return accessories;
}

/**
 * Parse consumable assignments CSV
 */
export function parseConsumableAssignmentsCSV(csvContent: string): CSVConsumableAssignment[] {
  const lines = csvContent.split('\n');

  if (lines.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  const headers = lines[0].split(',').map(header => header.trim().toLowerCase());

  const requiredHeaders = ['consumableid', 'assignedto'];
  const missingHeaders = requiredHeaders.filter(header => 
    !headers.some(h => h.includes('consumableid') || h.includes('consumable_id')) &&
    !headers.some(h => h.includes('assignedto') || h.includes('assigned_to'))
  );

  if (missingHeaders.length > 0) {
    throw new Error(`CSV file is missing required headers: consumableId, assignedTo`);
  }

  const assignments: CSVConsumableAssignment[] = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(',').map(value => value.trim());
    const assignment: any = {};

    headers.forEach((header, index) => {
      switch (header) {
        case 'consumableid':
        case 'consumable_id':
        case 'consumable id':
          assignment.consumableId = values[index];
          break;
        case 'assignedto':
        case 'assigned_to':
        case 'assigned to':
          assignment.assignedTo = values[index];
          break;
        case 'serialnumber':
        case 'serial_number':
        case 'serial number':
          assignment.serialNumber = values[index];
          break;
        case 'knoxid':
        case 'knox_id':
        case 'knox id':
          assignment.knoxId = values[index];
          break;
        case 'quantity':
          assignment.quantity = values[index];
          break;
        case 'notes':
          assignment.notes = values[index];
          break;
      }
    });

    if (assignment.consumableId && assignment.assignedTo) {
      assignments.push(assignment as CSVConsumableAssignment);
    }
  }

  return assignments;
}

/**
 * Convert CSV accessories to database accessory format
 */
export function convertCSVToAccessories(csvAccessories: CSVAccessory[]): InsertAccessory[] {
  if (!Array.isArray(csvAccessories)) {
    throw new Error('Invalid CSV data: expected array');
  }
  return csvAccessories.map(csvAccessory => {
    const quantity = csvAccessory.quantity ? parseInt(csvAccessory.quantity) : 1;

    // Map status string to status enum or default to AVAILABLE
    let status = AccessoryStatus.AVAILABLE;
    if (csvAccessory.status) {
      const statusLower = csvAccessory.status.toLowerCase();
      if (statusLower.includes('borrowed')) {
        status = AccessoryStatus.BORROWED;
      } else if (statusLower.includes('returned')) {
        status = AccessoryStatus.RETURNED;
      } else if (statusLower.includes('defective')) {
        status = AccessoryStatus.DEFECTIVE;
      }
    }

    return {
      name: csvAccessory.name,
      category: csvAccessory.category,
      status: status,
      description: null,
      purchaseDate: null,
      purchaseCost: null,
      location: null,
      serialNumber: csvAccessory.serialNumber || null,
      model: csvAccessory.model || null,
      manufacturer: csvAccessory.manufacturer || null,
      notes: csvAccessory.notes || `Imported via CSV`,
      quantity: quantity,
      assignedTo: null,
    };
  });
}

/**
 * Convert CSV VM data to VM objects
 */
export function convertCSVToVMs(csvVMs: CSVVM[]): Omit<VirtualMachine, "id">[] {
  if (!Array.isArray(csvVMs)) {
    throw new Error('Invalid CSV data: expected array');
  }
  return csvVMs.map(csvVM => {
    // Convert internetAccess string to boolean
    let internetAccess = false;
    if (csvVM.internetAccess) {
      const accessValue = csvVM.internetAccess.toLowerCase();
      internetAccess = accessValue === 'true' || accessValue === 'yes' || accessValue === '1';
    }

    return {
      vmId: csvVM.vmId || "N/A",
      vmName: csvVM.vmName || "N/A",
      vmStatus: csvVM.vmStatus || "Active",
      vmIp: csvVM.vmIp || "",
      internetAccess: internetAccess,
      vmOs: csvVM.vmOs || "",
      vmOsVersion: csvVM.vmOsVersion || "",
      cpuCount: csvVM.cpuCount ? parseInt(csvVM.cpuCount) : 0,
      memoryGB: csvVM.memoryGB ? parseInt(csvVM.memoryGB) : 0,
      diskCapacityGB: csvVM.diskCapacityGB ? parseInt(csvVM.diskCapacityGB) : 0,
      hypervisor: csvVM.hypervisor || "",
      hostname: csvVM.hostname || "",
      hostModel: csvVM.hostModel || "",
      hostIp: csvVM.hostIp || "",
      hostOs: csvVM.hostOs || "",
      rack: csvVM.rack || "",
      deployedBy: csvVM.deployedBy || "",
      user: csvVM.user || "",
      requestor: csvVM.requestor || "",
      knoxId: csvVM.knoxId || "",
      department: csvVM.department || "",
      startDate: csvVM.startDate || "",
      endDate: csvVM.endDate || "",
      jiraTicket: csvVM.jiraTicket || "",
      jiraNumber: csvVM.jiraNumber || "",
      approvalNumber: csvVM.approvalNumber || "",
      remarks: csvVM.remarks || "",
      dateDeleted: csvVM.dateDeleted || null,
      guestOs: csvVM.guestOs || "",
      powerState: csvVM.powerState || "stopped",
      memoryMB: csvVM.memoryMB ? parseInt(csvVM.memoryMB) : null,
      diskGB: csvVM.diskGB ? parseInt(csvVM.diskGB) : null,
      macAddress: csvVM.macAddress || "",
      vmwareTools: csvVM.vmwareTools || "",
      cluster: csvVM.cluster || "",
      datastore: csvVM.datastore || "",
    };
  });
}

/**
 * Parse a CSV file containing VM data
 */
export function parseVMCSV(csvContent: string): CSVVM[] {
  const rows = parseCSVLine(csvContent);

  if (rows.length < 2) {
    throw new Error('CSV file must contain at least a header row and one data row');
  }

  // Parse header row
  const headers = rows[0].map(header => header.trim().toLowerCase());

  // Validate required headers - only vmName is truly required
  const requiredHeaders = ['vmname'];
  const missingHeaders = requiredHeaders.filter(header => 
    !headers.some(h => h.includes('vmname') || h.includes('vm_name') || h.includes('name'))
  );

  if (missingHeaders.length > 0) {
    throw new Error(`CSV file is missing required headers: vmName (or vm_name)`);
  }

  // Parse data rows
  const vms: CSVVM[] = [];
  let emptyRowsSkipped = 0;

  for (let i = 1; i < rows.length; i++) {
    const values = rows[i];

    // Skip completely empty rows
    if (values.length === 0 || values.every(val => !val || val.trim() === '')) {
      emptyRowsSkipped++;
      continue;
    }

    // Handle rows with fewer columns than headers
    while (values.length < headers.length) {
      values.push('');
    }

    if (values.length > headers.length) {
      console.warn(`Row ${i + 1} has ${values.length} values, but header has ${headers.length} columns. Truncating extra values.`);
      values.splice(headers.length);
    }

    const vm: any = {};
    let hasAnyData = false;

    headers.forEach((header, index) => {
      let value = values[index] || '';

      // Handle empty values but preserve special characters
      if (!value || value.trim() === '' || value === 'N/A' || value === 'NULL') {
        value = '';
      } else {
        // Preserve special characters and whitespace - only trim outer whitespace
        value = value.replace(/^\s+|\s+$/g, '');
        hasAnyData = true;
      }

      // Map headers to VM properties with comprehensive field mapping
      switch (header) {
        // VM Core Information
        case 'vmid':
        case 'vm_id':
        case 'vm id':
          vm.vmId = value;
          break;
        case 'vmname':
        case 'vm_name':
        case 'vm name':
        case 'name':
          vm.vmName = value;
          break;
        case 'vmstatus':
        case 'vm_status':
        case 'vm status':
        case 'status':
          vm.vmStatus = value;
          break;
        case 'vmip':
        case 'vm_ip':
        case 'vm ip':
        case 'ip':
        case 'ipaddress':
        case 'ip_address':
          vm.vmIp = value;
          break;
        case 'vmos':
        case 'vm_os':
        case 'vm os':
        case 'os':
        case 'operating_system':
        case 'guestos':
        case 'guest_os':
          vm.vmOs = value;
          break;
        case 'cpucount':
        case 'cpu_count':
        case 'cpu count':
        case 'cpu':
        case 'cpus':
        case 'cpu cores':
        case 'cpucores':
          vm.cpuCount = value;
          break;
        case 'memorygb':
        case 'memory_gb':
        case 'memory gb':
        case 'memory':
        case 'memory (gb)':
          vm.memoryGB = value;
          break;
        case 'memorymb':
        case 'memory_mb':
        case 'memory mb':
          vm.memoryMB = value;
          break;
        case 'diskcapacitygb':
        case 'disk_capacity_gb':
        case 'disk capacity gb':
        case 'disk capacity (gb)':
        case 'diskgb':
        case 'disk_gb':
        case 'disk gb':
        case 'disk':
          vm.diskCapacityGB = value;
          break;

        // Request and Approval Information
        case 'requestor':
        case 'requested_by':
        case 'requester':
          vm.requestor = value;
          break;
        case 'knoxid':
        case 'knox_id':
        case 'knox id':
          vm.knoxId = value;
          break;
        case 'department':
        case 'dept':
          vm.department = value;
          break;
        case 'startdate':
        case 'start_date':
        case 'start date':
        case 'duration_start_date':
          vm.startDate = value;
          break;
        case 'enddate':
        case 'end_date':
        case 'end date':
        case 'duration_end_date':
          vm.endDate = value;
          break;
        case 'jiranumber':
        case 'jira_number':
        case 'jira number':
        case 'jiraticket':
        case 'jira_ticket':
        case 'jira ticket':
        case 'ticket':
          vm.jiraNumber = value;
          break;
        case 'approvalnumber':
        case 'approval_number':
        case 'approval number':
        case 'approval':
          vm.approvalNumber = value;
          break;
        case 'remarks':
        case 'notes':
        case 'description':
        case 'comment':
          vm.remarks = value;
          break;
        case 'guest_os':
        case 'guestos':
          vm.guestOs = value;
          break;
        case 'memory_mb':
        case 'memorymb':
          vm.memoryMB = value;
          break;
        case 'disk_gb':
        case 'diskgb':
          vm.diskGB = value;
          break;
        case 'vmware_tools':
        case 'vmwaretools':
          vm.vmwareTools = value;
          break;
        case 'cluster':
          vm.cluster = value;
          break;
        case 'datastore':
          vm.datastore = value;
          break;

        // Legacy fields
        case 'internetaccess':
        case 'internet_access':
        case 'internet access':
        case 'internet':
          vm.internetAccess = value;
          break;
        case 'vmosversion':
        case 'vm_os_version':
        case 'vm os version':
        case 'os_version':
        case 'osversion':
          vm.vmOsVersion = value;
          break;
        case 'hypervisor':
          vm.hypervisor = value;
          break;
        case 'hostname':
        case 'host_name':
        case 'host name':
          vm.hostname = value;
          break;
        case 'hostmodel':
        case 'host_model':
        case 'host model':
        case 'model':
          vm.hostModel = value;
          break;
        case 'hostip':
        case 'host_ip':
        case 'host ip':
          vm.hostIp = value;
          break;
        case 'hostos':
        case 'host_os':
        case 'host os':
          vm.hostOs = value;
          break;
        case 'rack':
          vm.rack = value;
          break;
        case 'deployedby':
        case 'deployed_by':
        case 'deployed by':
          vm.deployedBy = value;
          break;
        case 'user':
          vm.user = value;
          break;
        case 'datedeleted':
        case 'date_deleted':
        case 'deleted_date':
          vm.dateDeleted = value;
          break;

        // Additional legacy fields
        case 'powerstate':
        case 'power_state':
        case 'power state':
          vm.powerState = value;
          break;
        case 'macaddress':
        case 'mac_address':
        case 'mac address':
        case 'mac':
          vm.macAddress = value;
          break;
        case 'vmwaretools':
        case 'vmware_tools':
        case 'vmware tools':
        case 'tools':
          vm.vmwareTools = value;
          break;
        case 'cluster':
          vm.cluster = value;
          break;
        case 'datastore':
        case 'data_store':
        case 'storage':
          vm.datastore = value;
          break;
        case 'assignedto':
        case 'assigned_to':
        case 'assigned to':
          vm.assignedTo = value;
          break;
        case 'location':
        case 'site':
          vm.location = value;
          break;
        case 'serialnumber':
        case 'serial_number':
        case 'serial number':
        case 'serial':
          vm.serialNumber = value;
          break;
        case 'manufacturer':
        case 'vendor':
        case 'make':
          vm.manufacturer = value;
          break;
        case 'purchasedate':
        case 'purchase_date':
        case 'purchase date':
        case 'acquired_date':
          vm.purchaseDate = value;
          break;
        case 'purchasecost':
        case 'purchase_cost':
        case 'purchase cost':
        case 'cost':
        case 'price':
          vm.purchaseCost = value;
          break;
        case 'createddate':
        case 'created_date':
        case 'created date':
        case 'creation_date':
          vm.createdDate = value;
          break;
        case 'lastmodified':
        case 'last_modified':
        case 'last modified':
        case 'modified_date':
          vm.lastModified = value;
          break;
        default:
          // Store unknown headers as custom fields
          vm[header] = value;
          break;
      }
    });

    // Only include rows that have actual data and at least a VM name
    if (hasAnyData && vm.vmName && vm.vmName.trim() !== '') {
      vms.push(vm as CSVVM);
    } else {
      emptyRowsSkipped++;
      console.log(`Skipping empty or invalid data row ${i + 1}`);
    }
  }

  console.log(`VM CSV parsing completed: ${vms.length} VMs parsed, ${emptyRowsSkipped} empty rows skipped`);
  return vms;
}

/**
 * Convert VM data to CSV format for export
 */
export function convertToCSV(vms: VirtualMachine[]): string {
  if (vms.length === 0) {
    return '';
  }

  // Define headers - include ALL VM fields to match the add form
  const headers = [
    'vmId', 'vmName', 'vmStatus', 'vmIp', 'vmOs', 
    'cpuCount', 'memoryGB', 'diskCapacityGB',
    'requestor', 'knoxId', 'department', 
    'startDate', 'endDate', 'jiraNumber', 'approvalNumber', 'remarks',
    'internetAccess', 'vmOsVersion',
    'hypervisor', 'hostname', 'hostModel', 'hostIp', 'hostOs', 'rack',
    'deployedBy', 'user', 'jiraTicket'
  ];

  // Helper function to escape CSV values
  const escapeCSVValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    
    const stringValue = String(value);
    
    // Check if value contains special characters that need quoting
    const needsQuoting = stringValue.includes(',') || 
                        stringValue.includes('"') || 
                        stringValue.includes('\n') || 
                        stringValue.includes('\r');
    
    if (needsQuoting) {
      // Escape double quotes by doubling them
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  };

  // Create CSV content with properly escaped values
  const csvLines = [headers.join(',')];

  vms.forEach(vm => {
    const row = headers.map(header => {
      let value = vm[header as keyof VirtualMachine];

      // Handle special cases
      if (header === 'internetAccess') {
        value = value ? 'true' : 'false';
      }

      return escapeCSVValue(value);
    });

    csvLines.push(row.join(','));
  });

  return csvLines.join('\n');
}

/**
 * Universal file parser that handles both CSV and Excel files
 */
export async function parseFile(file: File): Promise<string> {
  const fileExtension = file.name.toLowerCase().split('.').pop();

  if (fileExtension === 'csv') {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string);
      };
      reader.onerror = () => reject(new Error('Failed to read CSV file'));
      reader.readAsText(file);
    });
  } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
    throw new Error('Excel files are not directly supported. Please save your Excel file as CSV format and upload the CSV file instead.');
  } else {
    throw new Error('Unsupported file format. Please upload a CSV file.');
  }
}

/**
 * Enhanced import function with file validation
 */
/**
 * Generate asset tag with better logic
 */
function generateAssetTag(category?: string, index?: number): string {
  const prefix = 'SRPH';
  const categoryCode = category ? 
    category.toUpperCase().substring(0, 3) : 
    'AST';
  const timestamp = Date.now().toString().slice(-6);
  const indexSuffix = index !== undefined ? String(index + 1).padStart(3, '0') : '001';

  return `${prefix}-${categoryCode}-${timestamp}-${indexSuffix}`;
}

export async function importDataFromFile(file: File, importType: 'assets' | 'components' | 'accessories' | 'vms'): Promise<any> {
  try {
    const csvContent = await parseFile(file);

    let data: any[];

    switch (importType) {
      case 'assets':
        const csvAssets = parseCSV(csvContent);
        if (!Array.isArray(csvAssets)) {
          throw new Error('Failed to parse CSV data - invalid format');
        }
        data = convertCSVToAssets(csvAssets);
        break;
      case 'components':
        const csvComponents = parseComponentCSV(csvContent);
        if (!Array.isArray(csvComponents)) {
          throw new Error('Failed to parse CSV data - invalid format');
        }
        data = convertCSVToComponents(csvComponents);
        break;
      case 'accessories':
        const csvAccessories = parseAccessoryCSV(csvContent);
        if (!Array.isArray(csvAccessories)) {
          throw new Error('Failed to parse CSV data - invalid format');
        }
        data = convertCSVToAccessories(csvAccessories);
        break;
      case 'vms':
        const csvVMs = parseVMCSV(csvContent);
        if (!Array.isArray(csvVMs)) {
          throw new Error('Failed to parse CSV data - invalid format');
        }
        data = convertCSVToVMs(csvVMs);
        break;
      default:
        throw new Error('Unsupported import type');
    }

    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('No valid data to import');
    }

    const response = await fetch(`/api/${importType}/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ [importType]: data }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Import failed');
    }

    return response.json();
  } catch (error) {
    throw error;
  }
}

export async function importAssets(assets: any[]): Promise<any> {
  const response = await fetch('/api/assets/import', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ assets }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.message || 'Import failed');
  }

  return response.json();
}

// CSV export functionality with proper special character handling
export function exportToCSV<T extends Record<string, any>>(
  data: T[],
  filename: string,
  columns?: Array<{
    key: keyof T;
    label: string;
  }>
) {
  if (!Array.isArray(data) || data.length === 0) return;

  // Use provided columns or infer from first item
  const cols = columns || Object.keys(data[0]).map(key => ({
    key: key as keyof T,
    label: key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1')
  }));

  // Helper function to escape CSV values with special characters
  const escapeCSVValue = (value: any): string => {
    if (value === null || value === undefined) return '';
    
    const stringValue = String(value);
    
    // Check if value contains special characters that need quoting
    const needsQuoting = stringValue.includes(',') || 
                        stringValue.includes('"') || 
                        stringValue.includes('\n') || 
                        stringValue.includes('\r') ||
                        stringValue.includes(':') ||
                        stringValue.includes('@') ||
                        stringValue.includes('.') ||
                        stringValue.includes('-') ||
                        stringValue.includes(';');
    
    if (needsQuoting) {
      // Escape double quotes by doubling them
      return `"${stringValue.replace(/"/g, '""')}"`;
    }
    
    return stringValue;
  };

  // Create CSV content with properly escaped values
  const headers = cols.map(col => escapeCSVValue(col.label)).join(',');
  const rows = data.map(item => 
    cols.map(col => escapeCSVValue(item[col.key])).join(',')
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
  }
}

// Alias for backward compatibility
export const downloadCSV = exportToCSV;