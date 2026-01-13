import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Input } from './ui/input';
import { Button } from './ui/button';

// Define the Zod schema for the form validation
const accessorySchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  description: z.string().optional(),
  purchaseCost: z.union([z.string(), z.number()]).optional().transform((val) => {
    if (typeof val === 'number') return val.toString();
    return val;
  }),
});

type AccessorySchemaType = z.infer<typeof accessorySchema>;

function AccessoryForm() {
  const { control, handleSubmit, formState: { errors } } = useForm<AccessorySchemaType>({
    resolver: zodResolver(accessorySchema),
    defaultValues: {
      name: '',
      description: '',
      purchaseCost: '',
    },
  });

  const onSubmit = (data: AccessorySchemaType) => {
    console.log(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto mt-8">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Name
        </label>
        <Controller
          name="name"
          control={control}
          render={({ field }) => (
            <Input
              id="name"
              placeholder="Accessory Name"
              {...field}
            />
          )}
        />
        {errors.name && (
          <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <Input
              id="description"
              placeholder="Accessory Description"
              {...field}
            />
          )}
        />
        {errors.description && (
          <p className="text-red-500 text-sm mt-1">{errors.description?.message}</p>
        )}
      </div>

      <div className="mt-4">
        <label htmlFor="purchaseCost" className="block text-sm font-medium text-gray-700">
          Purchase Cost
        </label>
        <Controller
          name="purchaseCost"
          control={control}
          render={({ field }) => (
            <Input
              type="number"
              step="0.01"
              placeholder="23"
              {...field}
            />
          )}
        />
        {errors.purchaseCost && (
          <p className="text-red-500 text-sm mt-1">{errors.purchaseCost?.message}</p>
        )}
      </div>

      <Button type="submit" className="mt-6">
        Submit
      </Button>
    </form>
  );
}

export default AccessoryForm;