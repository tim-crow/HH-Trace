export interface ShipmentBox {
  weightKg: number
  lengthCm: number
  widthCm: number
  heightCm: number
}

export interface ShipmentAddress {
  name: string
  company?: string
  street: string
  suburb: string
  state: string
  postcode: string
  phone?: string
  email?: string
  locationType?: "Factory/Warehouse" | "Residential"
}

export interface QuoteRequest {
  from: ShipmentAddress
  to: ShipmentAddress
  boxes: ShipmentBox[]
}

export interface CarrierQuote {
  carrier: string
  service: string
  price: number
  estimatedDays?: number
  provider: "aramex" | "freightexchange"
}

export interface BookingResult {
  provider: "aramex" | "freightexchange"
  carrier: string
  service: string
  price: number
  trackingNumber?: string
  labelUrl?: string
  labelPdf?: Buffer
  consignmentId?: string
}

export interface CourierResult {
  success: boolean
  booking?: BookingResult
  allQuotes: CarrierQuote[]
  error?: string
}
