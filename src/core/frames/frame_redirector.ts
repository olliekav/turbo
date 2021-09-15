import { FormInterceptor, FormInterceptorDelegate } from "./form_interceptor"
import { FrameElement } from "../../elements/frame_element"
import { LinkInterceptor, LinkInterceptorDelegate } from "./link_interceptor"

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
    const frame = this.findFrameElement(element)
    return frame ? frame != element.closest("turbo-frame") : false
  }

  linkClickIntercepted(element: Element, url: string) {
    const frame = this.findFrameElement(element)
    if (frame) {
      frame.setAttribute("reloadable", "")
      frame.src = url
    }
  }

  shouldInterceptFormSubmission(element: HTMLFormElement, submitter?: HTMLElement) {
    return !!this.findFrameElement(element, submitter)
  }

  formSubmissionIntercepted(element: HTMLFormElement, submitter?: HTMLElement) {
    const frame = this.findFrameElement(element, submitter)
    if (frame) {
      frame.removeAttribute("reloadable")
      frame.delegate.formSubmissionIntercepted(element, submitter)
    }
  }

  private findFrameElement(element: Element, submitter?: HTMLElement) {
    const id = submitter?.getAttribute("data-turbo-frame") || element.getAttribute("data-turbo-frame") || this.element.getAttribute("target")

    if (id && id != "_top") {
      const frame = this.element.querySelector(`#${id}:not([disabled])`)
      if (frame instanceof FrameElement) {
        return frame
      }
    } else {
      return element.closest<FrameElement>("turbo-frame:not([disabled])")
    }
  }
}
