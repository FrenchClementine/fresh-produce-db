'use client'

import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Truck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useMyTransporter } from '@/hooks/use-my-data'
import { useCurrentStaffMember } from '@/hooks/use-staff'

export default function MyTransporterDetailPage() {
  const params = useParams()
  const router = useRouter()
  const transporterId = params?.id as string

  const { data: transporter, isLoading, error } = useMyTransporter(transporterId)
  const { data: currentStaff } = useCurrentStaffMember()

  if (!currentStaff) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/my/transporters')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Transporters
        </Button>
        <div className="text-center py-12 text-muted-foreground">
          You must be logged in as a staff member to view transporter details.
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/my/transporters')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Transporters
        </Button>
        <div className="text-center py-12">Loading transporter details...</div>
      </div>
    )
  }

  if (error || !transporter) {
    return (
      <div className="space-y-6">
        <Button
          variant="ghost"
          onClick={() => router.push('/my/transporters')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Transporters
        </Button>
        <div className="text-center py-12 text-red-500">
          {error
            ? `Error loading transporter: ${(error as Error).message}`
            : 'Transporter not found or not assigned to you'
          }
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          onClick={() => router.push('/my/transporters')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Transporters
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
            <Truck className="h-8 w-8" />
            {transporter.name}
          </h1>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant={transporter.is_active ? "default" : "secondary"}>
              {transporter.is_active ? "Active" : "Inactive"}
            </Badge>
            <Badge variant="outline">
              Assigned to {currentStaff.name}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Contact Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {transporter.email && (
              <div className="flex items-center text-sm">
                <span className="font-medium w-20">Email:</span>
                {transporter.email}
              </div>
            )}
            {transporter.phone_number && (
              <div className="flex items-center text-sm">
                <span className="font-medium w-20">Phone:</span>
                {transporter.phone_number}
              </div>
            )}
            {(transporter.city || transporter.country) && (
              <div className="flex items-center text-sm">
                <span className="font-medium w-20">Location:</span>
                {[transporter.city, transporter.country].filter(Boolean).join(', ')}
              </div>
            )}
            {transporter.address && (
              <div className="text-sm">
                <div className="font-medium">Address:</div>
                <div className="text-muted-foreground">{transporter.address}</div>
              </div>
            )}
            {transporter.zip_code && (
              <div className="flex items-center text-sm">
                <span className="font-medium w-20">Zip Code:</span>
                {transporter.zip_code}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Service Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center text-sm">
              <span className="font-medium w-32">Diesel Surcharge:</span>
              <Badge variant="secondary">
                {transporter.diesel_surcharge_percentage}%
              </Badge>
            </div>
            <div className="flex items-center text-sm">
              <span className="font-medium w-32">Created:</span>
              {new Date(transporter.created_at).toLocaleDateString()}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm">
              {transporter.notes || (
                <span className="text-muted-foreground">No notes available</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Assignment Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center text-sm">
            <span className="font-medium w-32">Assigned Agent:</span>
            {transporter.staff?.name || currentStaff.name}
          </div>
          {(transporter.staff?.role || currentStaff.role) && (
            <div className="flex items-center text-sm">
              <span className="font-medium w-32">Role:</span>
              {transporter.staff?.role || currentStaff.role}
            </div>
          )}
          <div className="flex items-center text-sm">
            <span className="font-medium w-32">Status:</span>
            <Badge variant={transporter.is_active ? "default" : "secondary"}>
              {transporter.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}