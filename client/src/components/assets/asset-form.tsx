import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { 
  Form, 
  FormControl, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { AssetCategories, AssetStatus, AssetConditions, insertAssetSchema } from "@shared/schema";

// Extend the schema with validation rules - make optional fields truly optional
const assetFormSchema = z.object({
  assetTag: z.string().min(2, {
    message: "Asset tag must be at least 2 characters",
  }),
  name: z.string().min(2, {
    message: "Name must be at least 2 characters",
  }),
  category: z.string().min(1, {
    message: "Please select a category",
  }),
  status: z.string().min(1, {
    message: "Please select a status",
  }),
  condition: z.string().min(1, {
    message: "Please select a condition",
  }),
  // All other fields are optional and can be empty strings or null
  description: z.string().optional().or(z.literal("")),
  purchaseDate: z.string().optional().or(z.literal("")),
  purchaseCost: z.string().optional().or(z.literal("")),
  location: z.string().optional().or(z.literal("")),
  serialNumber: z.string().optional().or(z.literal("")),
  model: z.string().optional().or(z.literal("")),
  manufacturer: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  knoxId: z.string().optional().or(z.literal("")),
  ipAddress: z.string().optional().or(z.literal("")),
  macAddress: z.string().optional().or(z.literal("")),
  osType: z.string().optional().or(z.literal("")),
  department: z.string().optional().or(z.literal("")),
});

type AssetFormValues = z.infer<typeof assetFormSchema>;

interface AssetFormProps {
  onSubmit: (values: AssetFormValues) => void;
  isLoading: boolean;
  defaultValues?: Partial<AssetFormValues>;
}

export default function AssetForm({ 
  onSubmit, 
  isLoading,
  defaultValues 
}: AssetFormProps) {
  
  // Clean default values to handle null values from database
  const cleanedDefaults = {
    assetTag: defaultValues?.assetTag ?? "",
    name: defaultValues?.name ?? "",
    description: defaultValues?.description ?? "",
    category: defaultValues?.category ?? AssetCategories.LAPTOP,
    status: defaultValues?.status ?? AssetStatus.AVAILABLE,
    condition: defaultValues?.condition ?? AssetConditions.GOOD,
    purchaseDate: defaultValues?.purchaseDate ?? "",
    purchaseCost: defaultValues?.purchaseCost ?? "",
    location: defaultValues?.location ?? "",
    serialNumber: defaultValues?.serialNumber ?? "",
    model: defaultValues?.model ?? "",
    manufacturer: defaultValues?.manufacturer ?? "",
    notes: defaultValues?.notes ?? "",
    knoxId: defaultValues?.knoxId ?? "",
    ipAddress: defaultValues?.ipAddress ?? "",
    macAddress: defaultValues?.macAddress ?? "",
    osType: defaultValues?.osType ?? "",
    department: defaultValues?.department ?? "",
  };
  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: cleanedDefaults,
  });

  const handleSubmit = (values: AssetFormValues) => {
    // Submit values as they are - no conversion needed
    onSubmit(values);
  };

  return (
    <div className="form-content">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
          {/* Basic Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <FormField
            control={form.control}
            name="assetTag"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Tag*</FormLabel>
                <FormControl>
                  <Input placeholder="LT-MBP-0023" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name*</FormLabel>
                <FormControl>
                  <Input placeholder="MacBook Pro 16" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="category"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Category*</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(AssetCategories).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status*</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(AssetStatus).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {value.charAt(0).toUpperCase() + value.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="condition"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Condition*</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(AssetConditions).map(([key, value]) => (
                      <SelectItem key={key} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="serialNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Serial Number</FormLabel>
                <FormControl>
                  <Input placeholder="C02ZF0PXLVDL" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="model"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Model</FormLabel>
                <FormControl>
                  <Input placeholder="A2141" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer <span className="text-gray-400">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

          <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date <span className="text-gray-400">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

          <FormField
                control={form.control}
                name="purchaseCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Cost <span className="text-gray-400">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="2500.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

          <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location <span className="text-gray-400">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Head Office" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

          <FormField
            control={form.control}
            name="knoxId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Knox ID</FormLabel>
                <FormControl>
                  <Input placeholder="K12345" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
                control={form.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address <span className="text-gray-400">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="192.168.1.100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

          <FormField
                control={form.control}
                name="macAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MAC Address <span className="text-gray-400">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="00:1A:2B:3C:4D:5E" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

          <FormField
            control={form.control}
            name="osType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>OS Type</FormLabel>
                <FormControl>
                  <Input placeholder="Windows 10 Pro" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          </div>
          </div>

          {/* Device Details */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Device Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="serialNumber"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Serial Number</FormLabel>
                    <FormControl>
                      <Input placeholder="C02ZF0PXLVDL" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Model</FormLabel>
                    <FormControl>
                      <Input placeholder="A2141" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="manufacturer"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Manufacturer <span className="text-gray-400">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="osType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>OS Type</FormLabel>
                    <FormControl>
                      <Input placeholder="Windows 10 Pro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Purchase Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Purchase Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="purchaseDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Date <span className="text-gray-400">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="purchaseCost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Purchase Cost <span className="text-gray-400">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="2500.00" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Location & Department */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Location & Department</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location <span className="text-gray-400">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="Head Office" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="department"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Department</FormLabel>
                    <FormControl>
                      <Input placeholder="IT Department" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

          {/* Network Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Network Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="knoxId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Knox ID</FormLabel>
                    <FormControl>
                      <Input placeholder="K12345" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ipAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>IP Address <span className="text-gray-400">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="192.168.1.100" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="macAddress"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MAC Address <span className="text-gray-400">(Optional)</span></FormLabel>
                    <FormControl>
                      <Input placeholder="00:1A:2B:3C:4D:5E" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>

        {/* Additional Information */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300">Additional Information</h3>
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Brief description of the asset"
                      className="resize-none h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes <span className="text-gray-400">(Optional)</span></FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Additional notes about the asset"
                      className="resize-none h-20"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

        <div className="flex justify-end gap-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => form.reset()}>
              Reset
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Saving..." : "Save Asset"}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}