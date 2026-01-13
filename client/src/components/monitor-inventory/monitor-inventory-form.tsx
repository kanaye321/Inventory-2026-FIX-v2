
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

// Monitor inventory form schema - all fields optional
const monitorInventoryFormSchema = z.object({
  seatNumber: z.string().optional().or(z.literal('')),
  knoxId: z.string().optional().or(z.literal('')),
  assetNumber: z.string().optional().or(z.literal('')),
  serialNumber: z.string().optional().or(z.literal('')),
  model: z.string().optional().or(z.literal('')),
  remarks: z.string().optional().or(z.literal('')),
  department: z.string().optional().or(z.literal('')),
});

type MonitorInventoryFormValues = z.infer<typeof monitorInventoryFormSchema>;

interface MonitorInventoryFormProps {
  onSubmit: (values: MonitorInventoryFormValues) => void;
  isLoading: boolean;
  defaultValues?: Partial<MonitorInventoryFormValues>;
}

export default function MonitorInventoryForm({ 
  onSubmit, 
  isLoading,
  defaultValues = {
    seatNumber: "",
    knoxId: "",
    assetNumber: "",
    serialNumber: "",
    model: "",
    remarks: "",
    department: "",
  }
}: MonitorInventoryFormProps) {
  const form = useForm<MonitorInventoryFormValues>({
    resolver: zodResolver(monitorInventoryFormSchema),
    defaultValues: {
      seatNumber: defaultValues?.seatNumber || "",
      knoxId: defaultValues?.knoxId || "",
      assetNumber: defaultValues?.assetNumber || "",
      serialNumber: defaultValues?.serialNumber || "",
      model: defaultValues?.model || "",
      remarks: defaultValues?.remarks || "",
      department: defaultValues?.department || "",
    },
    mode: "onChange",
  });

  const handleSubmit = (values: MonitorInventoryFormValues) => {
    console.log('Form submitted with values:', values);

    // Convert empty strings to null for optional fields
    const sanitizedValues = {
      seatNumber: values.seatNumber?.trim() || null,
      knoxId: values.knoxId?.trim() || null,
      assetNumber: values.assetNumber?.trim() || null,
      serialNumber: values.serialNumber?.trim() || null,
      model: values.model?.trim() || null,
      remarks: values.remarks?.trim() || null,
      department: values.department?.trim() || null,
    };
    
    console.log('Sanitized values:', sanitizedValues);
    onSubmit(sanitizedValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="seatNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Seat Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. A001, B-15, Desk-101" {...field} />
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
                  <Input placeholder="e.g. KNOX001" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="assetNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Asset Number</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. MON-001, ASSET-123" {...field} />
                </FormControl>
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
                  <Input placeholder="e.g. SN123456789" {...field} />
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
                  <Input placeholder="e.g. Dell P2414H, HP E24 G4" {...field} />
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
                  <Input placeholder="e.g. IT Department, Finance" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remarks</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Additional notes about the monitor (e.g. condition, special configuration, etc.)"
                  className="resize-none"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => {
              console.log('Resetting form');
              form.reset();
            }}
            disabled={isLoading}
          >
            Reset
          </Button>
          <Button 
            type="submit" 
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : "Save Monitor"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
