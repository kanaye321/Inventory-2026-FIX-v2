import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// IT Equipment form schema with validation
const itEquipmentFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  category: z.string().min(1, "Category is required"),
  totalQuantity: z.string().min(1, "Total quantity is required"),
  model: z.string().optional(),
  location: z.string().optional(),
  dateAcquired: z.string().optional(),
  // Knox ID and Serial Number are removed from the initial creation form
  // They are only needed when assigning to a user.
  // knoxId: z.string().optional(),
  // serialNumber: z.string().optional(),
  remarks: z.string().optional(),
});

type ITEquipmentFormValues = z.infer<typeof itEquipmentFormSchema>;

interface ITEquipmentFormProps {
  onSubmit: (values: ITEquipmentFormValues) => void;
  isLoading: boolean;
  defaultValues?: Partial<ITEquipmentFormValues>;
}

export default function ITEquipmentForm({
  onSubmit,
  isLoading,
  defaultValues = {
    name: "",
    category: "",
    totalQuantity: "",
    model: "",
    location: "",
    dateAcquired: "",
    // knoxId: "",
    // serialNumber: "",
    remarks: "",
  }
}: ITEquipmentFormProps) {
  const form = useForm<ITEquipmentFormValues>({
    resolver: zodResolver(itEquipmentFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      category: defaultValues?.category || "",
      totalQuantity: defaultValues?.totalQuantity || "",
      model: defaultValues?.model || "",
      location: defaultValues?.location || "",
      dateAcquired: defaultValues?.dateAcquired || "",
      // knoxId: defaultValues?.knoxId || "",
      // serialNumber: defaultValues?.serialNumber || "",
      remarks: defaultValues?.remarks || "",
    },
    mode: "onChange",
  });

  const handleSubmit = (values: ITEquipmentFormValues) => {
    // Ensure all required fields are present
    const sanitizedValues = {
      name: values.name?.trim() || "",
      category: values.category?.trim() || "",
      totalQuantity: values.totalQuantity?.trim() || "",
      model: values.model?.trim() || null,
      location: values.location?.trim() || null,
      dateAcquired: values.dateAcquired || null,
      // knoxId: values.knoxId?.trim() || null,
      // serialNumber: values.serialNumber?.trim() || null,
      remarks: values.remarks?.trim() || null,
    };
    onSubmit(sanitizedValues);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Dell Laptop, HP Printer" {...field} />
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
                <FormControl>
                  <Input placeholder="e.g. Laptop, Desktop, Printer" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="totalQuantity"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Total Quantity*</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="e.g. 5" {...field} />
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
                <FormLabel>Model*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Dell Latitude 5520" {...field} />
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
                <FormLabel>Location*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Office A, IT Room" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="dateAcquired"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date Acquired</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Knox ID and Serial Number fields are removed from this form */}
          {/* They are only relevant when assigning equipment to a user */}
          {/*
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
          */}
        </div>

        <FormField
          control={form.control}
          name="remarks"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Remarks</FormLabel>
              <FormControl>
                <Textarea placeholder="Additional notes or remarks" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => form.reset()}
            disabled={isLoading}
          >
            Reset
          </Button>
          <Button
            type="submit"
            disabled={isLoading || !form.formState.isValid}
          >
            {isLoading ? "Creating..." : "Create Equipment"}
          </Button>
        </div>
      </form>
    </Form>
  );
}