
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const azureInventoryFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  type: z.string().min(1, "Type is required"),
  resourceGroup: z.string().min(1, "Resource Group is required"),
  location: z.string().min(1, "Location is required"),
  subscriptions: z.string().optional(),
  status: z.string().min(1, "Status is required"),
  remarks: z.string().optional(),
});

type AzureInventoryFormValues = z.infer<typeof azureInventoryFormSchema>;

interface AzureInventoryFormProps {
  onSubmit: (values: AzureInventoryFormValues) => void;
  isLoading: boolean;
  defaultValues?: Partial<AzureInventoryFormValues>;
}

export default function AzureInventoryForm({
  onSubmit,
  isLoading,
  defaultValues = {
    name: "",
    type: "",
    resourceGroup: "",
    location: "",
    subscriptions: "",
    status: "active",
    remarks: "",
  }
}: AzureInventoryFormProps) {
  const form = useForm<AzureInventoryFormValues>({
    resolver: zodResolver(azureInventoryFormSchema),
    defaultValues: {
      name: defaultValues?.name || "",
      type: defaultValues?.type || "",
      resourceGroup: defaultValues?.resourceGroup || "",
      location: defaultValues?.location || "",
      subscriptions: defaultValues?.subscriptions || "",
      status: defaultValues?.status || "active",
      remarks: defaultValues?.remarks || "",
    },
    mode: "onChange",
  });

  const handleSubmit = (values: AzureInventoryFormValues) => {
    const sanitizedValues = {
      name: values.name?.trim() || "",
      type: values.type?.trim() || "",
      resourceGroup: values.resourceGroup?.trim() || "",
      location: values.location?.trim() || "",
      subscriptions: values.subscriptions?.trim() || null,
      status: values.status || "active",
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
                  <Input placeholder="e.g. webapp-prod-01" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Virtual Machine, Storage Account" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="resourceGroup"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resource Group*</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. rg-production" {...field} />
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
                  <Input placeholder="e.g. East US, West Europe" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="subscriptions"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Subscriptions</FormLabel>
                <FormControl>
                  <Input placeholder="e.g. Production Subscription" {...field} />
                </FormControl>
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
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="stopped">Stopped</SelectItem>
                    <SelectItem value="deallocated">Deallocated</SelectItem>
                    <SelectItem value="deleted">Deleted</SelectItem>
                  </SelectContent>
                </Select>
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
                <Textarea placeholder="Additional notes" {...field} />
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
          <Button type="submit" disabled={isLoading || !form.formState.isValid}>
            {isLoading ? "Saving..." : "Save Resource"}
          </Button>
        </div>
      </form>
    </Form>
  );
}
