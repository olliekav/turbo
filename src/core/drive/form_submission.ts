import { FetchMethod, fetchMethodFromString } from "../../http/fetch_request"
import { expandURL } from "../url"

enum FormEnctype {
  urlEncoded = "application/x-www-form-urlencoded",
  multipart  = "multipart/form-data",
  plain      = "text/plain"
}

function formEnctypeFromString(encoding: string): FormEnctype {
  switch(encoding.toLowerCase()) {
    case FormEnctype.multipart: return FormEnctype.multipart
    case FormEnctype.plain:     return FormEnctype.plain
    default:                    return FormEnctype.urlEncoded
  }
}

export class FormSubmission {
  readonly formElement: HTMLFormElement
  readonly submitter: HTMLElement | null
  readonly formData: FormData

  constructor(formElement: HTMLFormElement, submitter: HTMLElement | null) {
    this.formElement = formElement
    this.submitter = submitter
    this.formData = buildFormData(formElement, submitter)
  }

  get method(): FetchMethod {
    const method = this.submitter?.getAttribute("formmethod") || this.formElement.getAttribute("method") || ""
    return fetchMethodFromString(method.toLowerCase()) || FetchMethod.get
  }

  get action(): string {
    const formElementAction = typeof this.formElement.action === 'string' ? this.formElement.action : null
    return this.submitter?.getAttribute("formaction") || this.formElement.getAttribute("action") || formElementAction || ""
  }

  get location(): URL {
    return expandURL(this.action)
  }

  get body() {
    if (this.enctype == FormEnctype.urlEncoded || this.method == FetchMethod.get) {
      return new URLSearchParams(this.stringFormData)
    } else {
      return this.formData
    }
  }

  get enctype(): FormEnctype {
    return formEnctypeFromString(this.submitter?.getAttribute("formenctype") || this.formElement.enctype)
  }

  private get stringFormData() {
    return [ ...this.formData ].reduce((entries, [ name, value ]) => {
      return entries.concat(typeof value == "string" ? [[ name, value ]] : [])
    }, [] as [string, string][])
  }
}

function buildFormData(formElement: HTMLFormElement, submitter: HTMLElement | null): FormData {
  const formData = new FormData(formElement)
  const name = submitter?.getAttribute("name")
  const value = submitter?.getAttribute("value")

  if (name && value != null && formData.get(name) != value) {
    formData.append(name, value)
  }

  return formData
}
