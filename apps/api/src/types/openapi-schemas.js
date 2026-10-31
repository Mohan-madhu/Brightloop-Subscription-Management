/**
 * OpenAPI 3.1 Component Schemas and Contract Specifications for Brightloop Billing.
 *
 * Defines the exact data interchange formats, field types, constraints, and validation
 * schemas matching Mohan's route integrations and Najid's frontend screens.
 */

export const OPENAPI_COMPONENTS = Object.freeze({
  openapi: '3.1.0',
  info: {
    title: 'Brightloop Subscription & Billing API Contracts',
    version: '2.0.0',
    description: 'Contract specifications for invoice generation, payments, GST calculations, and reports.'
  },
  components: {
    schemas: {
      DecimalString: {
        type: 'string',
        pattern: '^-?\\d+\\.\\d{2}$',
        description: 'Fixed-point decimal representation with exactly two decimal digits.',
        example: '1499.50'
      },
      CurrencyCode: {
        type: 'string',
        enum: ['INR', 'USD', 'EUR', 'GBP'],
        default: 'INR',
        description: 'ISO-4217 three-letter currency code.'
      },
      DateOnlyString: {
        type: 'string',
        pattern: '^\\d{4}-\\d{2}-\\d{2}$',
        description: 'ISO calendar date formatted as YYYY-MM-DD.',
        example: '2026-10-31'
      },
      ISODateTimeString: {
        type: 'string',
        format: 'date-time',
        description: 'ISO 8601 UTC timestamp formatted as YYYY-MM-DDTHH:mm:ss.sssZ.',
        example: '2026-10-31T07:30:00.000Z'
      },
      InvoiceStatus: {
        type: 'string',
        enum: ['DRAFT', 'CONFIRMED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'CANCELLED'],
        description: 'Lifecycle state of an invoice in the state machine.'
      },
      PaymentStatus: {
        type: 'string',
        enum: ['PENDING', 'CONFIRMED', 'FAILED', 'REFUNDED'],
        description: 'Lifecycle state of a payment transaction.'
      },
      PaymentMethod: {
        type: 'string',
        enum: ['RAZORPAY', 'BANK_TRANSFER', 'CASH', 'CHEQUE', 'CREDIT_NOTE', 'OTHER'],
        description: 'Payment collection channel or mechanism.'
      },
      SubscriptionStatus: {
        type: 'string',
        enum: ['DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'EXPIRED'],
        description: 'Lifecycle state of a recurring subscription.'
      },
      BillingInterval: {
        type: 'string',
        enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'],
        description: 'Cadence of recurring billing intervals.'
      },

      // -------------------------------------------------------------
      // Line item schemas
      // -------------------------------------------------------------
      InvoiceTaxItem: {
        type: 'object',
        required: ['taxRateId', 'code', 'percentage', 'amount'],
        properties: {
          taxRateId: { type: 'string', description: 'Unique identifier of the tax rate rule.' },
          code: { type: 'string', example: 'GST_18', description: 'Alphanumeric tax tax identification code.' },
          label: { type: 'string', example: 'GST 18% (CGST 9% + SGST 9%)' },
          percentage: { type: 'string', example: '18.00', description: 'Tax percentage rate.' },
          amount: { $ref: '#/components/schemas/DecimalString', description: 'Calculated tax amount in rupees.' }
        }
      },
      InvoiceDiscountItem: {
        type: 'object',
        required: ['discountId', 'code', 'amount'],
        properties: {
          discountId: { type: 'string', description: 'Unique identifier of the discount coupon.' },
          code: { type: 'string', example: 'OCTFEST25' },
          name: { type: 'string', example: 'Festival Promotion' },
          amount: { $ref: '#/components/schemas/DecimalString' }
        }
      },
      InvoiceLineSummary: {
        type: 'object',
        required: ['id', 'description', 'quantity', 'unitPrice', 'subtotal', 'taxTotal', 'total'],
        properties: {
          id: { type: 'string' },
          subscriptionLineId: { type: ['string', 'null'] },
          variantId: { type: ['string', 'null'] },
          description: { type: 'string' },
          quantity: { type: 'integer', minimum: 1 },
          unitPrice: { $ref: '#/components/schemas/DecimalString' },
          subtotal: { $ref: '#/components/schemas/DecimalString' },
          discountTotal: { $ref: '#/components/schemas/DecimalString', default: '0.00' },
          taxTotal: { $ref: '#/components/schemas/DecimalString', default: '0.00' },
          total: { $ref: '#/components/schemas/DecimalString' },
          taxes: {
            type: 'array',
            items: { $ref: '#/components/schemas/InvoiceTaxItem' }
          },
          discounts: {
            type: 'array',
            items: { $ref: '#/components/schemas/InvoiceDiscountItem' }
          }
        }
      },

      // -------------------------------------------------------------
      // Payment Record
      // -------------------------------------------------------------
      PaymentSummary: {
        type: 'object',
        required: ['id', 'amount', 'method', 'status', 'createdAt'],
        properties: {
          id: { type: 'string' },
          invoiceId: { type: 'string' },
          amount: { $ref: '#/components/schemas/DecimalString' },
          method: { $ref: '#/components/schemas/PaymentMethod' },
          status: { $ref: '#/components/schemas/PaymentStatus' },
          reference: { type: ['string', 'null'] },
          razorpayPaymentId: { type: ['string', 'null'] },
          razorpayOrderId: { type: ['string', 'null'] },
          createdAt: { $ref: '#/components/schemas/ISODateTimeString' },
          settledAt: { type: ['string', 'null'], format: 'date-time' }
        }
      },

      // -------------------------------------------------------------
      // Najid Screen Invoice Models
      // -------------------------------------------------------------
      InvoiceSummaryView: {
        type: 'object',
        required: [
          'id', 'invoiceNumber', 'customerId', 'customerName', 'status',
          'subtotal', 'taxTotal', 'total', 'amountPaid', 'amountDue',
          'issueDate', 'dueDate', 'createdAt', 'customerEmail', 'reference'
        ],
        properties: {
          id: { type: 'string', description: 'Internal primary key.' },
          invoiceNumber: { type: 'string', example: 'INV-2026-0001' },
          customerId: { type: 'string' },
          customerName: { type: 'string' },
          customerEmail: { type: 'string', format: 'email' },
          subscriptionId: { type: ['string', 'null'] },
          status: { $ref: '#/components/schemas/InvoiceStatus' },
          subtotal: { $ref: '#/components/schemas/DecimalString' },
          discountTotal: { $ref: '#/components/schemas/DecimalString' },
          taxTotal: { $ref: '#/components/schemas/DecimalString' },
          total: { $ref: '#/components/schemas/DecimalString' },
          amountPaid: { $ref: '#/components/schemas/DecimalString' },
          amountDue: { $ref: '#/components/schemas/DecimalString' },
          issueDate: { $ref: '#/components/schemas/DateOnlyString' },
          dueDate: { $ref: '#/components/schemas/DateOnlyString' },
          createdAt: { $ref: '#/components/schemas/ISODateTimeString' },
          isOverdue: { type: 'boolean' },
          reference: { type: ['string', 'null'] }
        }
      },

      InvoiceDetailView: {
        allOf: [
          { $ref: '#/components/schemas/InvoiceSummaryView' },
          {
            type: 'object',
            required: ['lines', 'payments', 'customerAddress', 'history'],
            properties: {
              customerAddress: { type: 'string' },
              lines: {
                type: 'array',
                items: { $ref: '#/components/schemas/InvoiceLineSummary' }
              },
              payments: {
                type: 'array',
                items: { $ref: '#/components/schemas/PaymentSummary' }
              },
              history: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['id', 'status', 'createdAt'],
                  properties: {
                    id: { type: 'string' },
                    status: { type: 'string' },
                    note: { type: ['string', 'null'] },
                    actorId: { type: ['string', 'null'] },
                    createdAt: { $ref: '#/components/schemas/ISODateTimeString' }
                  }
                }
              }
            }
          }
        ]
      },

      // -------------------------------------------------------------
      // Reports and Dashboards
      // -------------------------------------------------------------
      FinanceDashboardTotals: {
        type: 'object',
        required: [
          'invoiced', 'collected', 'outstanding', 'overdueCount',
          'totalInvoiced', 'totalCollected', 'totalOutstanding', 'currency'
        ],
        properties: {
          invoiced: { $ref: '#/components/schemas/DecimalString' },
          collected: { $ref: '#/components/schemas/DecimalString' },
          outstanding: { $ref: '#/components/schemas/DecimalString' },
          overdueCount: { type: 'integer', minimum: 0 },
          totalInvoiced: { $ref: '#/components/schemas/DecimalString' },
          totalCollected: { $ref: '#/components/schemas/DecimalString' },
          totalOutstanding: { $ref: '#/components/schemas/DecimalString' },
          currency: { type: 'string', example: 'INR' }
        }
      },

      KanbanBucketView: {
        type: 'object',
        required: ['id', 'key', 'label', 'days', 'count', 'totalOutstanding', 'invoices'],
        properties: {
          id: { type: 'string' },
          key: { type: 'string', example: '1-30' },
          label: { type: 'string', example: '1-30 days overdue' },
          days: { type: 'string' },
          count: { type: 'integer', minimum: 0 },
          totalOutstanding: { $ref: '#/components/schemas/DecimalString' },
          invoices: {
            type: 'array',
            items: { $ref: '#/components/schemas/InvoiceSummaryView' }
          }
        }
      },

      QuarterlyReportRunView: {
        type: 'object',
        required: ['id', 'quarter', 'year', 'period', 'status', 'downloadAvailable', 'createdAt'],
        properties: {
          id: { type: 'string' },
          quarter: { type: 'integer', minimum: 1, maximum: 4 },
          year: { type: 'integer', minimum: 2000, maximum: 2100 },
          period: { type: 'string', example: 'Q3 2026' },
          status: { type: 'string', enum: ['PENDING', 'RUNNING', 'COMPLETED', 'FAILED'] },
          downloadAvailable: { type: 'boolean' },
          downloadUrl: { type: ['string', 'null'] },
          summary: {
            type: 'object',
            properties: {
              totalInvoiced: { $ref: '#/components/schemas/DecimalString' },
              totalCollected: { $ref: '#/components/schemas/DecimalString' },
              activeSubscriptionsCount: { type: 'integer' }
            }
          },
          createdAt: { $ref: '#/components/schemas/ISODateTimeString' }
        }
      },

      // -------------------------------------------------------------
      // Webhook & Razorpay Contracts
      // -------------------------------------------------------------
      RazorpayWebhookPayload: {
        type: 'object',
        required: ['entity', 'account_id', 'event', 'contains', 'payload', 'created_at'],
        properties: {
          entity: { type: 'string', enum: ['event'] },
          account_id: { type: 'string' },
          event: {
            type: 'string',
            enum: ['payment.captured', 'payment.failed', 'order.paid']
          },
          contains: {
            type: 'array',
            items: { type: 'string' }
          },
          payload: {
            type: 'object',
            required: ['payment'],
            properties: {
              payment: {
                type: 'object',
                required: ['entity'],
                properties: {
                  entity: {
                    type: 'object',
                    required: ['id', 'amount', 'currency', 'status'],
                    properties: {
                      id: { type: 'string', pattern: '^pay_[A-Za-z0-9]+$' },
                      order_id: { type: ['string', 'null'], pattern: '^order_[A-Za-z0-9]+$' },
                      amount: { type: 'integer', minimum: 100, description: 'Amount in paise.' },
                      currency: { type: 'string', example: 'INR' },
                      status: { type: 'string', enum: ['captured', 'failed', 'refunded'] },
                      method: { type: 'string' },
                      notes: {
                        type: 'object',
                        properties: {
                          invoiceId: { type: 'string' },
                          customerId: { type: 'string' }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          created_at: { type: 'integer' }
        }
      }
    }
  }
});

/**
 * Validates that an object conforms to basic structural requirements of a component schema.
 * @param {string} schemaName
 * @param {Record<string, unknown>} target
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateOpenApiComponent(schemaName, target) {
  const schema = OPENAPI_COMPONENTS.components.schemas[schemaName];
  if (!schema) {
    return { valid: false, errors: [`Schema "${schemaName}" is not defined in OpenAPI components.`] };
  }

  const errors = [];
  const required = schema.required || (schema.allOf ? schema.allOf.flatMap((s) => s.required || []) : []);

  for (const field of required) {
    if (target[field] === undefined || target[field] === null) {
      errors.push(`Missing required field: "${field}" for ${schemaName}.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
