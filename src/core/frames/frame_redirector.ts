import { FormInterceptor, FormInterceptorDelegate } from "./form_interceptor"
import { FrameElement } from "../../elements/frame_element"
import { LinkInterceptor, LinkInterceptorDelegate } from "./link_interceptor"
import { FetchMethod, fetchMethodFromString } from "../../http/fetch_request"

export class FrameRedirector implements LinkInterceptorDelegate, FormInterceptorDelegate {
  readonly element: Element
  readonly linkInterceptor: LinkInterceptor
  readonly formInterceptor: FormInterceptor

  constructor(element: Element) {
    this.element = element
    this.linkInterceptor = new LinkInterceptor(this, element)
    this.formInterceptor = new FormInterceptor(this, element)
  }

  start() {
    this.linkInterceptor.start()
    this.formInterceptor.start()
  }

  stop() {
    this.linkInterceptor.stop()
    this.formInterceptor.stop()
  }

  shouldInterceptLinkClick(element: Element, url: string) {
    return this.shouldRedirect(element)
  }

  linkClickIntercepted(element: Element, url: string) {
    const frame = this.findFrameElement(element)
    if (frame) {
      frame.setAttribute("reloadable", "")
      frame.src = url
    }
  }

  shouldInterceptFormSubmission(element: HTMLFormElement, submitter?: HTMLElement) {
    return this.shouldRedirect(element, submitter)
  }

  formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element, submitter)
    if (frame) {
      frame.removeAttribute("reloadable")
      frame.delegate.formSubmissionIntercepted(element, submitter)
    }
  }

  private shouldRedirect(element: Element, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element, submitter)

    if (frame) {
      if (frame == element.closest("turbo-frame")) {
        if (element instanceof HTMLFormElement) {
          const target = submitter?.getAttribute("data-turbo-frame")
            || element.getAttribute("data-turbo-frame")
            || frame.getAttribute("target")
          const method = submitter?.getAttribute("formmethod") || element.getAttribute("method") || ""

          if (fetchMethodFromString(method) == FetchMethod.get) {
            return false
          } else {
            return target == "_top"
          }
        } else {
          return frame.getAttribute("target") == "_top"
        }
      } else {
        return true
      }
    } else {
      return false
    }
  }

  private findFrameElement(element: Element, submitter?: HTMLElement) {
    const id = element.getAttribute("data-turbo-frame") || submitter?.getAttribute("data-turbo-frame")

    if (id == "_top") {
      return element.closest<FrameElement>("turbo-frame:not([disabled])")
    } else if (id) {
      const frame = this.element.querySelector(`#${id}:not([disabled])`)

      if (frame instanceof FrameElement) {
        return frame
      }
    } else {
      return element.closest<FrameElement>("turbo-frame:not([disabled])")
    }
  }
}
